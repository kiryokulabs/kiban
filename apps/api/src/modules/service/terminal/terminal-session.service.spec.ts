import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InstalledService, InstalledServiceManager } from '@kiban/core';
import { TerminalSessionService } from './terminal-session.service';
import type { TerminalProcess, TerminalProvider } from './terminal.types';

class FakeTerminalProcess implements TerminalProcess {
  public readonly writes: string[] = [];
  public readonly resizes: { readonly cols: number; readonly rows: number }[] = [];
  public closed = false;
  private dataHandler: ((data: string) => void) | null = null;
  private exitHandler: ((code: number | null) => void) | null = null;

  public write(data: string): void { this.writes.push(data); }
  public resize(cols: number, rows: number): void { this.resizes.push({ cols, rows }); }
  public close(): void { this.closed = true; }
  public onData(handler: (data: string) => void): void { this.dataHandler = handler; }
  public onExit(handler: (code: number | null) => void): void { this.exitHandler = handler; }
  public emitData(data: string): void { this.dataHandler?.(data); }
  public emitExit(code: number | null): void { this.exitHandler?.(code); }
}

class FakeTerminalProvider implements TerminalProvider {
  public readonly processes: FakeTerminalProcess[] = [];
  public readonly calls: { readonly serviceId: string; readonly containerId: string }[] = [];
  public async open(service: InstalledService, containerId: string): Promise<TerminalProcess> {
    this.calls.push({ serviceId: service.id, containerId });
    const process = new FakeTerminalProcess();
    this.processes.push(process);
    return process;
  }
}

const installedService = (): InstalledService => ({
  id: 'installed-1',
  environmentId: 'env-1',
  serviceId: 'supabase',
  name: 'Supabase',
  status: 'running',
  configuration: {},
  runtime: {
    provider: 'docker-compose',
    containers: [
      { id: 'container-1', name: 'supabase', status: 'running', health: 'healthy', image: 'supabase/postgres:15', restartCount: 0 },
      { id: 'container-2', name: 'supabase-db', status: 'running', health: 'healthy', image: 'postgres:15', restartCount: 0 }
    ]
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
});

const manager = (service: InstalledService): Pick<InstalledServiceManager, 'get'> => ({ get: vi.fn(async () => service) });

describe('TerminalSessionService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a terminal session for a container that belongs to the installed service', async () => {
    const provider = new FakeTerminalProvider();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    const session = await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, {});

    expect(session.containerId).toBe('container-1');
    expect(provider.calls).toEqual([{ serviceId: 'installed-1', containerId: 'container-1' }]);
  });

  it('rejects a terminal session for a container outside the installed service runtime', async () => {
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, new FakeTerminalProvider(), { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await expect(terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'other-container' }, {})).rejects.toThrow('Container does not belong to this service.');
  });

  it('forwards input to the active terminal process', async () => {
    const provider = new FakeTerminalProvider();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, {});
    terminal.write('socket-1', 'ls\n');

    expect(provider.processes[0]?.writes).toEqual(['ls\n']);
  });

  it('forwards resize events to the active terminal process', async () => {
    const provider = new FakeTerminalProvider();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, {});
    terminal.resize('socket-1', 120, 40);

    expect(provider.processes[0]?.resizes).toEqual([{ cols: 120, rows: 40 }]);
  });

  it('emits terminal output through the session handlers', async () => {
    const provider = new FakeTerminalProvider();
    const onOutput = vi.fn();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, { onOutput });
    provider.processes[0]?.emitData('hello');

    expect(onOutput).toHaveBeenCalledWith('hello');
  });

  it('closes the previous session when the same socket opens another container', async () => {
    const provider = new FakeTerminalProvider();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, {});
    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-2' }, {});

    expect(provider.processes[0]?.closed).toBe(true);
    expect(provider.processes[1]?.closed).toBe(false);
  });

  it('closes and removes a session on disconnect', async () => {
    const provider = new FakeTerminalProvider();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 5000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, {});
    terminal.close('socket-1');

    expect(provider.processes[0]?.closed).toBe(true);
    expect(terminal.hasSession('socket-1')).toBe(false);
  });

  it('closes idle sessions after the configured idle timeout', async () => {
    vi.useFakeTimers();
    const provider = new FakeTerminalProvider();
    const onError = vi.fn();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 100, maxLifetimeMs: 1000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, { onError });
    vi.advanceTimersByTime(100);

    expect(onError).toHaveBeenCalledWith('Terminal session timed out.');
    expect(provider.processes[0]?.closed).toBe(true);
    expect(terminal.hasSession('socket-1')).toBe(false);
  });

  it('resets the idle timeout when input is received', async () => {
    vi.useFakeTimers();
    const provider = new FakeTerminalProvider();
    const onError = vi.fn();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 100, maxLifetimeMs: 1000 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, { onError });
    vi.advanceTimersByTime(80);
    terminal.write('socket-1', 'pwd\n');
    vi.advanceTimersByTime(80);

    expect(onError).not.toHaveBeenCalled();
    expect(terminal.hasSession('socket-1')).toBe(true);
  });

  it('closes sessions after the configured maximum lifetime', async () => {
    vi.useFakeTimers();
    const provider = new FakeTerminalProvider();
    const onError = vi.fn();
    const terminal = new TerminalSessionService(manager(installedService()) as InstalledServiceManager, provider, { idleTimeoutMs: 1000, maxLifetimeMs: 100 });

    await terminal.open('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, { onError });
    vi.advanceTimersByTime(100);

    expect(onError).toHaveBeenCalledWith('Terminal session reached its maximum lifetime.');
    expect(provider.processes[0]?.closed).toBe(true);
    expect(terminal.hasSession('socket-1')).toBe(false);
  });
});
