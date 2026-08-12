import { describe, expect, it, vi } from 'vitest';
import { TerminalGateway } from './terminal.gateway';
import type { TerminalSessionService } from './terminal-session.service';

class FakeSocket {
  public readonly id = 'socket-1';
  public readonly events: { readonly event: string; readonly payload: unknown }[] = [];
  public emit(event: string, payload: unknown): void { this.events.push({ event, payload }); }
}

const sessionService = () => ({
  open: vi.fn(async () => ({ sessionId: 'session-1', serviceId: 'installed-1', containerId: 'container-1' })),
  write: vi.fn(),
  resize: vi.fn(),
  close: vi.fn()
}) as unknown as TerminalSessionService;

describe('TerminalGateway', () => {
  it('opens a terminal session and emits connected payload', async () => {
    const sessions = sessionService();
    const gateway = new TerminalGateway(sessions);
    const socket = new FakeSocket();

    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });

    expect(sessions.open).toHaveBeenCalledWith('socket-1', { serviceId: 'installed-1', containerId: 'container-1' }, expect.any(Object));
    expect(socket.events).toContainEqual({ event: 'terminal:connected', payload: { sessionId: 'session-1', serviceId: 'installed-1', containerId: 'container-1' } });
  });

  it('emits an error for invalid connect payloads', async () => {
    const gateway = new TerminalGateway(sessionService());
    const socket = new FakeSocket();

    await gateway.connect(socket, { serviceId: '', containerId: 'container-1' });

    expect(socket.events).toEqual([{ event: 'terminal:error', payload: { message: 'Invalid terminal connection payload.' } }]);
  });

  it('forwards input and resize payloads to active sessions', () => {
    const sessions = sessionService();
    const gateway = new TerminalGateway(sessions);
    const socket = new FakeSocket();

    gateway.input(socket, { data: 'ls\n' });
    gateway.resize(socket, { cols: 100, rows: 30 });

    expect(sessions.write).toHaveBeenCalledWith('socket-1', 'ls\n');
    expect(sessions.resize).toHaveBeenCalledWith('socket-1', 100, 30);
  });

  it('closes sessions on explicit and unexpected disconnects', () => {
    const sessions = sessionService();
    const gateway = new TerminalGateway(sessions);
    const socket = new FakeSocket();

    gateway.disconnect(socket);
    gateway.handleDisconnect(socket);

    expect(sessions.close).toHaveBeenCalledTimes(2);
    expect(sessions.close).toHaveBeenCalledWith('socket-1');
  });
});
