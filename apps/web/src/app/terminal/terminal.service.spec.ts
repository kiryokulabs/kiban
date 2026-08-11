import { describe, expect, it } from 'vitest';
import { filter, firstValueFrom } from 'rxjs';
import { TerminalSocketSession, type TerminalSocket } from './terminal.service';

class FakeSocket implements TerminalSocket {
  public readonly emitted: { readonly event: string; readonly payload?: unknown }[] = [];
  public disconnected = false;
  private readonly handlers = new Map<string, ((payload?: unknown) => void)[]>();

  public on(event: string, handler: (payload?: unknown) => void): void {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
  }

  public emit(event: string, payload?: unknown): void { this.emitted.push({ event, payload }); }
  public disconnect(): void { this.disconnected = true; }
  public trigger(event: string, payload?: unknown): void { for (const handler of this.handlers.get(event) ?? []) handler(payload); }
}

describe('TerminalService', () => {
  it('connects to the backend terminal namespace and sends the selected service/container', () => {
    const sockets: FakeSocket[] = [];
    const service = new TerminalSocketSession(() => { const socket = new FakeSocket(); sockets.push(socket); return socket; });

    service.connect('service-1', 'container-1');
    sockets[0]?.trigger('connect');

    expect(sockets[0]?.emitted).toContainEqual({ event: 'terminal:connect', payload: { serviceId: 'service-1', containerId: 'container-1' } });
  });

  it('publishes connected state after backend confirms the session', async () => {
    const socket = new FakeSocket();
    const service = new TerminalSocketSession(() => socket);
    const state = firstValueFrom(service.state$.pipe(filter((value) => value === 'connected')));

    service.connect('service-1', 'container-1');
    socket.trigger('terminal:connected', { sessionId: 's1', serviceId: 'service-1', containerId: 'container-1' });

    await expect(state).resolves.toBe('connected');
  });

  it('publishes terminal output chunks from the backend', async () => {
    const socket = new FakeSocket();
    const service = new TerminalSocketSession(() => socket);
    const output = firstValueFrom(service.output$.pipe(filter((value) => value === 'hello')));

    service.connect('service-1', 'container-1');
    socket.trigger('terminal:output', { data: 'hello' });

    await expect(output).resolves.toBe('hello');
  });

  it('forwards input and resize events to the backend', () => {
    const socket = new FakeSocket();
    const service = new TerminalSocketSession(() => socket);

    service.connect('service-1', 'container-1');
    service.write('ls\n');
    service.resize(120, 40);

    expect(socket.emitted).toContainEqual({ event: 'terminal:input', payload: { data: 'ls\n' } });
    expect(socket.emitted).toContainEqual({ event: 'terminal:resize', payload: { cols: 120, rows: 40 } });
  });

  it('disconnects the previous socket before opening a new terminal session', () => {
    const sockets: FakeSocket[] = [];
    const service = new TerminalSocketSession(() => { const socket = new FakeSocket(); sockets.push(socket); return socket; });

    service.connect('service-1', 'container-1');
    service.connect('service-1', 'container-2');

    expect(sockets[0]?.emitted).toContainEqual({ event: 'terminal:disconnect', payload: undefined });
    expect(sockets[0]?.disconnected).toBe(true);
    expect(sockets).toHaveLength(2);
  });

  it('publishes error state when backend emits terminal errors', async () => {
    const socket = new FakeSocket();
    const service = new TerminalSocketSession(() => socket);
    const state = firstValueFrom(service.state$.pipe(filter((value) => value === 'error')));

    service.connect('service-1', 'container-1');
    socket.trigger('terminal:error', { message: 'boom' });

    await expect(state).resolves.toBe('error');
  });
});
