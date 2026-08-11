import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { InstalledServiceManager } from '@kiban/core';
import { INSTALLED_SERVICE_MANAGER } from '../interfaces/service.constants';
import { TERMINAL_PROVIDER, type OpenTerminalRequest, type TerminalHandlers, type TerminalProcess, type TerminalProvider, type TerminalSessionInfo, type TerminalSessionOptions } from './terminal.types';

interface ActiveTerminalSession {
  readonly info: TerminalSessionInfo;
  readonly process: TerminalProcess;
  readonly handlers: TerminalHandlers;
  idleTimer: ReturnType<typeof setTimeout> | null;
  lifetimeTimer: ReturnType<typeof setTimeout> | null;
}

const DEFAULT_OPTIONS: TerminalSessionOptions = { idleTimeoutMs: 5 * 60 * 1000, maxLifetimeMs: 30 * 60 * 1000 };

/** Coordinates one interactive terminal session per websocket client. */
@Injectable()
export class TerminalSessionService {
  private readonly sessions = new Map<string, ActiveTerminalSession>();

  public constructor(
    @Inject(INSTALLED_SERVICE_MANAGER) private readonly services: InstalledServiceManager,
    @Inject(TERMINAL_PROVIDER) private readonly terminalProvider: TerminalProvider,
    @Optional()
    private readonly options: TerminalSessionOptions = DEFAULT_OPTIONS
  ) {}

  /** Opens a new session for a socket, replacing any previous session for that socket. */
  public async open(socketId: string, request: OpenTerminalRequest, handlers: TerminalHandlers): Promise<TerminalSessionInfo> {
    this.close(socketId);
    const service = await this.services.get(request.serviceId);
    if (!this.containerBelongsToService(service.runtime, request.containerId)) throw new Error('Container does not belong to this service.');

    const process = await this.terminalProvider.open(service, request.containerId);
    const info = { sessionId: randomUUID(), serviceId: request.serviceId, containerId: request.containerId };
    const session: ActiveTerminalSession = { info, process, handlers, idleTimer: null, lifetimeTimer: null };

    process.onData((data) => { this.touch(socketId); handlers.onOutput?.(data); });
    process.onExit((code) => { handlers.onExit?.(code); this.remove(socketId, false); });

    this.sessions.set(socketId, session);
    this.scheduleTimers(socketId, session);
    return info;
  }

  /** Writes user input into the active session for a socket. */
  public write(socketId: string, data: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.touch(socketId);
    session.process.write(data);
  }

  /** Resizes the active session if the runtime supports it. */
  public resize(socketId: string, cols: number, rows: number): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.touch(socketId);
    session.process.resize(cols, rows);
  }

  /** Closes and removes the active session for a socket. */
  public close(socketId: string): void { this.remove(socketId, true); }

  /** Returns whether a socket currently owns a terminal session. */
  public hasSession(socketId: string): boolean { return this.sessions.has(socketId); }

  private containerBelongsToService(runtime: Readonly<Record<string, unknown>> | null, containerId: string): boolean {
    const containers = runtime?.['containers'];
    if (!Array.isArray(containers)) return false;
    return containers.some((container) => {
      if (!container || typeof container !== 'object' || Array.isArray(container)) return false;
      return (container as Readonly<Record<string, unknown>>)['id'] === containerId;
    });
  }

  private scheduleTimers(socketId: string, session: ActiveTerminalSession): void {
    session.idleTimer = setTimeout(() => this.expire(socketId, 'Terminal session timed out.'), this.options.idleTimeoutMs);
    session.lifetimeTimer = setTimeout(() => this.expire(socketId, 'Terminal session reached its maximum lifetime.'), this.options.maxLifetimeMs);
  }

  private touch(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => this.expire(socketId, 'Terminal session timed out.'), this.options.idleTimeoutMs);
  }

  private expire(socketId: string, message: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.handlers.onError?.(message);
    this.remove(socketId, true);
  }

  private remove(socketId: string, closeProcess: boolean): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    if (session.idleTimer) clearTimeout(session.idleTimer);
    if (session.lifetimeTimer) clearTimeout(session.lifetimeTimer);
    this.sessions.delete(socketId);
    if (closeProcess) session.process.close();
  }
}
