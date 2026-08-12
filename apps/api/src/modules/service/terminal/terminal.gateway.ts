import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { TerminalSessionService } from './terminal-session.service';
import type { OpenTerminalRequest } from './terminal.types';

interface TerminalSocket {
  readonly id: string;
  emit(event: string, payload: unknown): void;
}

interface TerminalInputPayload { readonly data: string; }
interface TerminalResizePayload { readonly cols: number; readonly rows: number; }

/** WebSocket gateway that streams browser terminal input/output to runtime containers. */
@WebSocketGateway({ namespace: '/terminal', cors: { origin: true, credentials: true } })
export class TerminalGateway implements OnGatewayDisconnect {
  public constructor(private readonly sessions: TerminalSessionService) {}

  /** Opens a terminal session for one installed-service runtime container. */
  @SubscribeMessage('terminal:connect')
  public async connect(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): Promise<void> {
    try {
      const request = this.parseOpenPayload(payload);
      const session = await this.sessions.open(client.id, request, {
        onOutput: (data) => client.emit('terminal:output', { data }),
        onExit: (code) => client.emit('terminal:exit', { code }),
        onError: (message) => client.emit('terminal:error', { message })
      });
      client.emit('terminal:connected', session);
    } catch (error: unknown) {
      client.emit('terminal:error', { message: error instanceof Error ? error.message : 'Could not open terminal session.' });
    }
  }

  /** Forwards terminal keystrokes to the active container session. */
  @SubscribeMessage('terminal:input')
  public input(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): void {
    const parsed = this.parseInputPayload(payload);
    if (!parsed) return;
    this.sessions.write(client.id, parsed.data);
  }

  /** Forwards terminal resize messages to the active session. */
  @SubscribeMessage('terminal:resize')
  public resize(@ConnectedSocket() client: TerminalSocket, @MessageBody() payload: unknown): void {
    const parsed = this.parseResizePayload(payload);
    if (!parsed) return;
    this.sessions.resize(client.id, parsed.cols, parsed.rows);
  }

  /** Closes an explicit terminal disconnect request. */
  @SubscribeMessage('terminal:disconnect')
  public disconnect(@ConnectedSocket() client: TerminalSocket): void { this.sessions.close(client.id); }

  /** Closes terminal sessions when the socket disconnects unexpectedly. */
  public handleDisconnect(client: TerminalSocket): void { this.sessions.close(client.id); }

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
