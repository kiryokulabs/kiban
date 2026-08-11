import { describe, expect, it } from 'vitest';
import type { InstalledService } from '@kiban/core';
import type net from 'node:net';
import { DockerComposeTerminalProvider, type TerminalCommandRunner } from './docker-compose-terminal.provider';

class FakeTerminalCommandRunner implements TerminalCommandRunner {
  public execCalls: { readonly containerId: string; readonly cmd: readonly string[] }[] = [];
  public startCalls: { readonly execId: string; readonly detach: boolean; readonly tty: boolean }[] = [];
  public resizeCalls: { readonly execId: string; readonly cols: number; readonly rows: number }[] = [];
  public fakeSocket: net.Socket | null = null;

  public async createExec(containerId: string, cmd: readonly string[]): Promise<string> {
    this.execCalls.push({ containerId, cmd: [...cmd] });
    return 'exec-fake-id';
  }

  public async startExec(_execId: string, options: { readonly detach: boolean; readonly tty: boolean }): Promise<net.Socket> {
    this.startCalls.push({ execId: 'exec-fake-id', detach: options.detach, tty: options.tty });
    if (this.fakeSocket) return this.fakeSocket;
    // Return a minimal fake socket-like object
    const listeners: Record<string, ((...args: readonly unknown[]) => void)[]> = {};
    const fakeSock = {
      on: (event: string, handler: (...args: readonly unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
        return fakeSock;
      },
      removeListener: () => fakeSock,
      write: () => true,
      destroy: () => undefined,
      unshift: () => undefined
    } as unknown as net.Socket;
    return fakeSock;
  }

  public async resizeExec(execId: string, cols: number, rows: number): Promise<void> {
    this.resizeCalls.push({ execId, cols, rows });
  }
}

const service = (overrides?: Partial<InstalledService>): InstalledService => ({
  id: 'installed-1',
  environmentId: 'env-1',
  serviceId: 'supabase',
  name: 'Supabase',
  status: 'running',
  configuration: {},
  runtime: {
    provider: 'docker-compose',
    workingDirectory: '/tmp/kiban/runtime/supabase',
    containers: [
      { id: 'container-1', name: 'supabase', status: 'running', health: 'healthy', image: 'supabase/postgres:15', restartCount: 0 }
    ]
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides
});

describe('DockerComposeTerminalProvider', () => {
  it('creates and starts an exec session via Docker API for a known container', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);

    await provider.open(service(), 'container-1');

    expect(runner.execCalls).toEqual([{ containerId: 'container-1', cmd: ['sh', '-l'] }]);
    expect(runner.startCalls).toEqual([{ execId: 'exec-fake-id', detach: false, tty: true }]);
  });

  it('rejects unknown containers before creating an exec session', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);

    await expect(provider.open(service(), 'other-container')).rejects.toThrow('Container does not belong to this service.');
    expect(runner.execCalls).toEqual([]);
  });

  it('rejects stopped containers', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);
    const stopped = service({ runtime: { provider: 'docker-compose', workingDirectory: '/tmp/kiban/runtime/supabase', containers: [{ id: 'container-1', name: 'supabase', status: 'stopped', health: 'unknown', image: 'supabase/postgres:15', restartCount: 0 }] } });

    await expect(provider.open(stopped, 'container-1')).rejects.toThrow('Container is not running.');
    expect(runner.execCalls).toEqual([]);
  });

  it('rejects services without Docker Compose runtime metadata', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);

    await expect(provider.open(service({ runtime: null }), 'container-1')).rejects.toThrow('Terminal runtime is not available.');
    expect(runner.execCalls).toEqual([]);
  });

  it('resizes the exec session via Docker API after opening', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);
    const process = await provider.open(service(), 'container-1');

    // Clear initial resize call to test explicit resize only
    runner.resizeCalls.length = 0;
    process.resize(120, 40);

    expect(runner.resizeCalls).toEqual([{ execId: 'exec-fake-id', cols: 120, rows: 40 }]);
  });

  it('sends initial resize after starting the exec session', async () => {
    const runner = new FakeTerminalCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);

    await provider.open(service(), 'container-1');

    // Initial resize should be called with default 120x40
    expect(runner.resizeCalls).toEqual([{ execId: 'exec-fake-id', cols: 120, rows: 40 }]);
  });

  it('does not send initial resize if runner.resizeExec is not available', async () => {
    const runner = new NoResizeCommandRunner();
    const provider = new DockerComposeTerminalProvider(runner);

    await provider.open(service(), 'container-1');

    // No crash, no resize calls
    expect(runner.resizeCalls).toEqual([]);
  });
});

/** Fake runner without resizeExec support (simulates old runner interface). */
class NoResizeCommandRunner implements TerminalCommandRunner {
  public readonly resizeCalls: { readonly execId: string; readonly cols: number; readonly rows: number }[] = [];

  public async createExec(_containerId: string, _cmd: readonly string[]): Promise<string> {
    return 'exec-fake-id';
  }

  public async startExec(_execId: string, _options: { readonly detach: boolean; readonly tty: boolean }): Promise<net.Socket> {
    const listeners: Record<string, ((...args: readonly unknown[]) => void)[]> = {};
    return {
      on: (event: string, handler: (...args: readonly unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
        return {} as net.Socket;
      },
      removeListener: () => ({} as net.Socket),
      write: () => true,
      destroy: () => undefined,
      unshift: () => undefined
    } as unknown as net.Socket;
  }
  // NOTE: resizeExec intentionally omitted — simulates older runner without resize support
}
