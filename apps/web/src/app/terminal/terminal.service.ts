import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import type { ConnectionState } from './terminal.presenter';

export interface TerminalSocket {
  on(event: string, handler: (payload?: unknown) => void): void;
  emit(event: string, payload?: unknown): void;
  disconnect(): void;
}

export type TerminalSocketFactory = (url: string) => TerminalSocket;

const socketFactory: TerminalSocketFactory = (url: string) => io(url, { withCredentials: true });

/** Browser-side terminal transport backed by the API Socket.IO gateway. */
export class TerminalSocketSession {
  private readonly apiUrl = 'http://localhost:3000/terminal';
  private socket: TerminalSocket | null = null;
  private readonly state = new BehaviorSubject<ConnectionState>('disconnected');
  private readonly errorMessage = new BehaviorSubject<string | null>(null);
  private readonly output = new Subject<string>();

  public readonly state$ = this.state.asObservable();
  public readonly errorMessage$ = this.errorMessage.asObservable();
  public readonly output$ = this.output.asObservable();

  public constructor(private readonly createSocket: TerminalSocketFactory) {}

  /** Opens a terminal session for one installed service container. */
  public connect(serviceId: string, containerId: string): void {
    this.disconnect();
    this.errorMessage.next(null);
    this.state.next('connecting');
    this.output.next(`\r\nConnecting to ${containerId}...\r\n`);
    const socket = this.createSocket(this.apiUrl);
    this.socket = socket;

    let connectRequested = false;
    const requestTerminal = (): void => {
      if (connectRequested) return;
      connectRequested = true;
      socket.emit('terminal:connect', { serviceId, containerId });
    };

    socket.on('connect', requestTerminal);
    socket.on('terminal:connected', () => { this.state.next('connected'); this.output.next('\r\nConnected. Starting shell...\r\n'); });
    socket.on('terminal:output', (payload) => {
      const data = this.stringPayload(payload, 'data');
      if (data !== null) this.output.next(data);
    });
    socket.on('terminal:error', (payload) => this.fail(this.stringPayload(payload, 'message') ?? 'Could not open terminal session.'));
    socket.on('terminal:exit', () => this.state.next('disconnected'));
    socket.on('disconnect', () => this.state.next('disconnected'));
    socket.on('connect_error', (payload) => this.fail(this.errorText(payload) ?? 'Could not connect to terminal gateway.'));

    requestTerminal();
  }

  /** Forwards user input into the active terminal session. */
  public write(data: string): void { this.socket?.emit('terminal:input', { data }); }

  /** Forwards terminal size changes to the backend session. */
  public resize(cols: number, rows: number): void { this.socket?.emit('terminal:resize', { cols, rows }); }

  /** Closes the active terminal session and socket. */
  public disconnect(): void {
    if (!this.socket) return;
    this.socket.emit('terminal:disconnect');
    this.socket.disconnect();
    this.socket = null;
    this.state.next('disconnected');
  }

  private fail(message: string): void {
    this.errorMessage.next(message);
    this.output.next(`\r\nTerminal error: ${message}\r\n`);
    this.state.next(message.toLowerCase().includes('timed out') ? 'timeout' : 'error');
  }

  private errorText(value: unknown): string | null {
    if (value instanceof Error) return value.message;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return typeof value === 'string' ? value : null;
    const message = (value as Readonly<Record<string, unknown>>)['message'];
    return typeof message === 'string' ? message : null;
  }

  private stringPayload(payload: unknown, key: string): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const value = (payload as Readonly<Record<string, unknown>>)[key];
    return typeof value === 'string' ? value : null;
  }
}

/** Injectable terminal transport used by Angular components. */
@Injectable({ providedIn: 'root' })
export class TerminalService extends TerminalSocketSession {
  public constructor() { super(socketFactory); }
}
