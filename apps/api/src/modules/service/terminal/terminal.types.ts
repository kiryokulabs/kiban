import type { InstalledService } from '@kiban/core';

export interface OpenTerminalRequest {
  readonly serviceId: string;
  readonly containerId: string;
}

export interface TerminalSessionInfo {
  readonly sessionId: string;
  readonly serviceId: string;
  readonly containerId: string;
}

export interface TerminalHandlers {
  readonly onOutput?: (data: string) => void;
  readonly onExit?: (code: number | null) => void;
  readonly onError?: (message: string) => void;
}

export interface TerminalProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
  onData(handler: (data: string) => void): void;
  onExit(handler: (code: number | null) => void): void;
}

export interface TerminalProvider {
  open(service: InstalledService, containerId: string): Promise<TerminalProcess>;
}

export interface TerminalSessionOptions {
  readonly idleTimeoutMs: number;
  readonly maxLifetimeMs: number;
}

export const TERMINAL_PROVIDER = Symbol('TERMINAL_PROVIDER');
