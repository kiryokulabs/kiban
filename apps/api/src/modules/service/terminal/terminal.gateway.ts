import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { AUTH_SESSION_COOKIE_NAME } from '../../auth/interfaces/auth.constants';
import { AuthService } from '../../auth/services/auth.service';
import { AuthTransportPolicy } from '../../auth/services/auth-transport-policy';
import { TerminalSessionService } from './terminal-session.service';
import type { OpenTerminalRequest } from './terminal.types';

interface TerminalSocket {
  readonly id: string;
  readonly connected: boolean;
  readonly handshake: { readonly headers: Readonly<Record<string, string | string[] | undefined>> };
  readonly request?: { readonly socket: { readonly encrypted?: boolean } };
  disconnect(close?: boolean): void;
  emit(event: string, payload: unknown): void;
}

interface TerminalInputPayload { readonly data: string; }
interface TerminalResizePayload { readonly cols: number; readonly rows: number; }

interface AuthenticatedSocket {
  readonly client: TerminalSocket;
  readonly token: string;
  readonly userId: string;
  readonly expiry: ReturnType<typeof setTimeout>;
  readonly recheck: ReturnType<typeof setInterval>;
}

/** WebSocket gateway that streams browser terminal input/output to runtime containers. */
@WebSocketGateway({ namespace: '/terminal' })
export class TerminalGateway implements OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(TerminalGateway.name);
  private readonly connections = new Map<string, AuthenticatedSocket>();
  private readonly unsubscribe: () => void;

  public constructor(private readonly sessions: TerminalSessionService, private readonly auth: AuthService, private readonly policy: AuthTransportPolicy) {
    this.unsubscribe = this.auth.onSessionRevoked((event) => {
      for (const connection of this.connections.values()) {
        if (event.token === connection.token || event.userId === connection.userId) this.reject(connection.client);
      }
    });
  }

  /** Authenticates the handshake independently of Nest's HTTP-only global guard. */
  public async handleConnection(client: TerminalSocket): Promise<void> { await this.authorize(client); }

  /** Releases subscriptions, connections and session timers during shutdown. */
  public onModuleDestroy(): void {
    this.unsubscribe();
    for (const connection of this.connections.values()) this.reject(connection.client);
  }

  /** Opens a terminal session for one installed-service runtime container. */
  @SubscribeMessage('terminal:connect')
  public async connect(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): Promise<void> {
    if (!(await this.authorize(client))) return;
    try {
      const request = this.parseOpenPayload(payload);
      const session = await this.sessions.open(client.id, request, {
        onOutput: (data) => client.emit('terminal:output', { data }),
        onExit: (code) => client.emit('terminal:exit', { code }),
        onError: (message) => client.emit('terminal:error', { message })
      });
      if (!client.connected || !(await this.authorize(client))) {
        this.sessions.close(client.id);
        return;
      }
      client.emit('terminal:connected', session);
    } catch (error: unknown) {
      client.emit('terminal:error', { message: error instanceof Error ? error.message : 'Could not open terminal session.' });
    }
  }

  /** Forwards terminal keystrokes to the active container session. */
  @SubscribeMessage('terminal:input')
  public async input(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): Promise<void> {
    if (!(await this.authorize(client))) return;
    const parsed = this.parseInputPayload(payload);
    if (!parsed) return;
    this.sessions.write(client.id, parsed.data);
  }

  /** Forwards terminal resize messages to the active session. */
  @SubscribeMessage('terminal:resize')
  public async resize(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): Promise<void> {
    if (!(await this.authorize(client))) return;
    const parsed = this.parseResizePayload(payload);
    if (!parsed) return;
    this.sessions.resize(client.id, parsed.cols, parsed.rows);
  }

  /** Closes an explicit terminal disconnect request. */
  @SubscribeMessage('terminal:disconnect')
  public disconnect(@ConnectedSocket() client: TerminalSocket): void { this.sessions.close(client.id); }

  /** Closes terminal sessions when the socket disconnects unexpectedly. */
  public handleDisconnect(client: TerminalSocket): void {
    const connection = this.connections.get(client.id);
    if (connection) { clearTimeout(connection.expiry); clearInterval(connection.recheck); }
    this.connections.delete(client.id);
    this.sessions.close(client.id);
  }

  private reject(client: TerminalSocket): void {
    this.handleDisconnect(client);
    client.emit('terminal:error', { message: 'Authentication required.' });
    client.disconnect(true);
  }

  private async authorize(client: TerminalSocket): Promise<boolean> {
    if (!client.connected) return false;
    const headers = client.handshake.headers;
    const cookie = typeof headers['cookie'] === 'string' ? headers['cookie'] : '';
    const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_SESSION_COOKIE_NAME}=`))?.slice(AUTH_SESSION_COOKIE_NAME.length + 1);
    if (!token) { this.reject(client); return false; }
    try {
      if (!this.connections.has(client.id)) {
        // Same-origin polling GETs may omit Origin; validate their Referer instead.
        const origin = typeof headers['origin'] === 'string' ? headers['origin']
          : headers['origin'] === undefined && typeof headers['referer'] === 'string' ? new URL(headers['referer']).origin : undefined;
        const host = typeof headers['host'] === 'string' ? headers['host'] : undefined;
        const protocol = client.request?.socket.encrypted || headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        if (!(await this.policy.allowsOrigin(origin, host, protocol))) { this.reject(client); return false; }
      }
      const authenticated = await this.auth.session(token);
      if (!client.connected) return false;
      const remaining = authenticated.session.expiresAt.getTime() - Date.now();
      if (remaining <= 0) { this.reject(client); return false; }
      if (!this.connections.has(client.id)) {
        const expiry = setTimeout(() => this.reject(client), remaining);
        const recheck = setInterval(() => { void this.authorize(client); }, 30_000);
        expiry.unref();
        recheck.unref();
        this.connections.set(client.id, { client, token, userId: authenticated.user.id, expiry, recheck });
      }
      return true;
    } catch {
      this.logger.debug('Terminal authentication rejected.');
      this.reject(client);
      return false;
    }
  }

  private parseOpenPayload(payload: unknown): OpenTerminalRequest {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid terminal connection payload.');
    const record = payload as Readonly<Record<string, unknown>>;
    const serviceId = record['serviceId'];
    const containerId = record['containerId'];
    if (typeof serviceId !== 'string' || !serviceId || typeof containerId !== 'string' || !containerId) throw new Error('Invalid terminal connection payload.');
    return { serviceId, containerId };
  }

  private parseInputPayload(payload: unknown): TerminalInputPayload | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const data = (payload as Readonly<Record<string, unknown>>)['data'];
    return typeof data === 'string' ? { data } : null;
  }

  private parseResizePayload(payload: unknown): TerminalResizePayload | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const record = payload as Readonly<Record<string, unknown>>;
    const cols = record['cols'];
    const rows = record['rows'];
    return typeof cols === 'number' && Number.isFinite(cols) && typeof rows === 'number' && Number.isFinite(rows) ? { cols, rows } : null;
  }
}
