import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TerminalGateway } from './terminal.gateway';
import type { TerminalSessionService } from './terminal-session.service';
import type { AuthService } from '../../auth/services/auth.service';
import type { AuthTransportPolicy } from '../../auth/services/auth-transport-policy';

class FakeSocket {
  public readonly id = 'socket-1';
  public connected = true;
  public readonly handshake = { headers: { cookie: 'kiban_session=socket-token', host: 'localhost:8080', origin: 'http://localhost:8080' } };
  public readonly request = { socket: { remoteAddress: '127.0.0.1', encrypted: false } };
  public readonly events: { readonly event: string; readonly payload: unknown }[] = [];
  public emit(event: string, payload: unknown): void { this.events.push({ event, payload }); }
  public disconnect(): void { this.connected = false; }
}

const sessionService = () => ({ open: vi.fn(async () => ({ sessionId: 'session-1', serviceId: 'installed-1', containerId: 'container-1' })), write: vi.fn(), resize: vi.fn(), close: vi.fn() });
const gateways: TerminalGateway[] = [];
const createGateway = () => {
  const sessions = sessionService();
  const session = vi.fn(async () => ({ user: { id: 'user-1', email: 'admin@example.com', role: 'admin' as const, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() }, session: { id: 'session-1', userId: 'user-1', tokenHash: 'hash', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } }));
  let revoke: (event: { token?: string; userId?: string }) => void = () => undefined;
  const auth = { session, onSessionRevoked: (listener: typeof revoke) => { revoke = listener; return () => undefined; } };
  const policy = { allowsOrigin: vi.fn(async () => true) };
  const sessionMethods: Pick<TerminalSessionService, 'open' | 'write' | 'resize' | 'close'> = sessions;
  const authMethods: Pick<AuthService, 'session' | 'onSessionRevoked'> = auth;
  const policyMethods: Pick<AuthTransportPolicy, 'allowsOrigin'> = policy;
  const gateway = new TerminalGateway(sessionMethods as TerminalSessionService, authMethods as AuthService, policyMethods as AuthTransportPolicy);
  gateways.push(gateway);
  return { gateway, sessions, session, policy, revoke: (event: Parameters<typeof revoke>[0]) => revoke(event) };
};
afterEach(() => { for (const gateway of gateways.splice(0)) gateway.onModuleDestroy(); vi.useRealTimers(); });

describe('TerminalGateway authentication', () => {
  it('opens a terminal only after authenticating the handshake cookie', async () => {
    const { gateway, sessions, session } = createGateway();
    const socket = new FakeSocket();
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    expect(session).toHaveBeenCalledWith('socket-token');
    expect(sessions.open).toHaveBeenCalledOnce();
    expect(socket.events).toContainEqual({ event: 'terminal:connected', payload: { sessionId: 'session-1', serviceId: 'installed-1', containerId: 'container-1' } });
  });

  it.each(['missing cookie', 'invalid session', 'untrusted origin'])('blocks %s before opening a terminal', async (reason) => {
    const { gateway, sessions, session, policy } = createGateway();
    const socket = new FakeSocket();
    if (reason === 'missing cookie') socket.handshake.headers.cookie = '';
    if (reason === 'invalid session') session.mockRejectedValue(new UnauthorizedException());
    if (reason === 'untrusted origin') policy.allowsOrigin.mockResolvedValue(false);
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    expect(sessions.open).not.toHaveBeenCalled();
    expect(socket.connected).toBe(false);
  });

  it('rejects invalid connect payloads without opening runtime resources', async () => {
    const { gateway, sessions } = createGateway();
    const socket = new FakeSocket();
    await gateway.connect(socket, { serviceId: '', containerId: 'container-1' });
    expect(sessions.open).not.toHaveBeenCalled();
    expect(socket.events).toContainEqual({ event: 'terminal:error', payload: { message: 'Invalid terminal connection payload.' } });
  });

  it('rechecks the session before input or resizing and closes revoked connections', async () => {
    const { gateway, sessions, session } = createGateway();
    const socket = new FakeSocket();
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    await gateway.input(socket, { data: 'ls\n' });
    await gateway.resize(socket, { cols: 100, rows: 30 });
    expect(sessions.write).toHaveBeenCalledWith('socket-1', 'ls\n');
    expect(sessions.resize).toHaveBeenCalledWith('socket-1', 100, 30);
    session.mockRejectedValue(new UnauthorizedException());
    sessions.write.mockClear();
    await gateway.input(socket, { data: 'must-not-run' });
    expect(sessions.write).not.toHaveBeenCalled();
    expect(sessions.close).toHaveBeenCalledWith(socket.id);
    expect(socket.connected).toBe(false);
  });

  it.each([{ token: 'socket-token' }, { userId: 'user-1' }])('immediately disconnects on logout or password-change revocation', async (event) => {
    const { gateway, sessions, revoke } = createGateway();
    const socket = new FakeSocket();
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    revoke(event);
    expect(sessions.close).toHaveBeenCalledWith(socket.id);
    expect(socket.connected).toBe(false);
  });

  it('closes idle connections when their auth session expires', async () => {
    vi.useFakeTimers();
    const { gateway, sessions } = createGateway();
    const socket = new FakeSocket();
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    await vi.advanceTimersByTimeAsync(60_001);
    expect(socket.connected).toBe(false);
    expect(sessions.close).toHaveBeenCalledWith(socket.id);
  });

  it('does not leak a terminal opened while the socket is being revoked', async () => {
    const { gateway, sessions, revoke } = createGateway();
    const socket = new FakeSocket();
    sessions.open.mockImplementationOnce(async () => { revoke({ token: 'socket-token' }); return { sessionId: 'session-1', serviceId: 'installed-1', containerId: 'container-1' }; });
    await gateway.connect(socket, { serviceId: 'installed-1', containerId: 'container-1' });
    expect(sessions.close).toHaveBeenCalledWith(socket.id);
    expect(socket.events.some((event) => event.event === 'terminal:connected')).toBe(false);
  });
});
