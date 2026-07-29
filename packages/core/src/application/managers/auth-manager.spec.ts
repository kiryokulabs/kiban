import { describe, expect, it, vi } from 'vitest';
import { AdminRegistrationClosedError, InvalidCredentialsError, UnauthenticatedError } from '../../domain/auth/auth-errors.js';
import type { AuthSession } from '../../domain/auth/auth-session.js';
import type { User } from '../../domain/users/user.js';
import type { AuthSessionRepository, CreateAuthSessionInput } from '../interfaces/auth-session-repository.js';
import type { PasswordHasher } from '../interfaces/password-hasher.js';
import type { SessionTokenService } from '../interfaces/session-token-service.js';
import type { UserRepository } from '../interfaces/user-repository.js';
import { AuthManager } from './auth-manager.js';

const now = new Date('2026-07-29T12:00:00.000Z');

class MemoryUsers implements UserRepository {
  public readonly users = new Map<string, User>();

  public async adminExists(): Promise<boolean> {
    return [...this.users.values()].some((user) => user.role === 'admin');
  }

  public async createAdmin(input: { readonly email: string; readonly passwordHash: string }): Promise<User> {
    const user: User = { id: `user-${this.users.size + 1}`, email: input.email, passwordHash: input.passwordHash, role: 'admin', createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  public async createOperator(input: { readonly email: string; readonly passwordHash: string }): Promise<User> {
    const user: User = { id: `user-${this.users.size + 1}`, email: input.email, passwordHash: input.passwordHash, role: 'operator', createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  public async list(): Promise<readonly User[]> {
    return [...this.users.values()];
  }

  public async deleteById(id: string): Promise<void> {
    this.users.delete(id);
  }

  public async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  public async updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, passwordHash, updatedAt });
    }
  }
}

class MemorySessions implements AuthSessionRepository {
  public readonly sessions = new Map<string, AuthSession>();

  public async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session: AuthSession = { id: `session-${this.sessions.size + 1}`, userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt, createdAt: now };
    this.sessions.set(session.tokenHash, session);
    return session;
  }

  public async findActiveByTokenHash(tokenHash: string, at: Date): Promise<AuthSession | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= at) {
      return null;
    }
    return session;
  }

  public async revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session) {
      this.sessions.set(tokenHash, { ...session, revokedAt });
    }
  }
}

const passwordHasher: PasswordHasher = {
  hash: vi.fn(async (password: string) => `hash:${password}`),
  verify: vi.fn(async (password: string, hash: string) => hash === `hash:${password}`)
};

const tokenService: SessionTokenService = {
  createToken: vi.fn(async () => 'opaque-token'),
  hashToken: vi.fn(async (token: string) => `token-hash:${token}`)
};

const createManager = () => {
  const users = new MemoryUsers();
  const sessions = new MemorySessions();
  const manager = new AuthManager(users, sessions, passwordHasher, tokenService, { sessionTtlMs: 60_000, now: () => now });
  return { manager, users, sessions };
};

describe('AuthManager', () => {
  it('requires admin setup until an admin exists', async () => {
    const { manager } = createManager();
    await expect(manager.getBootstrapStatus()).resolves.toEqual({ requiresAdminSetup: true });
  });

  it('creates the first admin and normalizes email', async () => {
    const { manager, users } = createManager();
    const user = await manager.registerInitialAdmin({ email: ' Admin@Example.COM ', password: 'password123' });
    expect(user).toEqual({ id: 'user-1', email: 'admin@example.com', role: 'admin' });
    expect(await users.adminExists()).toBe(true);
  });

  it('blocks admin registration after the first admin exists', async () => {
    const { manager } = createManager();
    await manager.registerInitialAdmin({ email: 'admin@example.com', password: 'password123' });
    await expect(manager.registerInitialAdmin({ email: 'second@example.com', password: 'password123' })).rejects.toBeInstanceOf(AdminRegistrationClosedError);
  });

  it('logs in with valid credentials and stores only the token hash', async () => {
    const { manager, sessions } = createManager();
    await manager.registerInitialAdmin({ email: 'admin@example.com', password: 'password123' });
    const result = await manager.login({ email: 'admin@example.com', password: 'password123' });
    expect(result.token).toBe('opaque-token');
    expect(sessions.sessions.has('token-hash:opaque-token')).toBe(true);
  });

  it('rejects invalid credentials', async () => {
    const { manager } = createManager();
    await manager.registerInitialAdmin({ email: 'admin@example.com', password: 'password123' });
    await expect(manager.login({ email: 'admin@example.com', password: 'wrong-pass' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('authenticates a valid session token', async () => {
    const { manager } = createManager();
    await manager.registerInitialAdmin({ email: 'admin@example.com', password: 'password123' });
    const login = await manager.login({ email: 'admin@example.com', password: 'password123' });
    await expect(manager.authenticate(login.token)).resolves.toMatchObject({ user: { email: 'admin@example.com' } });
  });

  it('changes password and revokes the current session', async () => {
    const { manager } = createManager();
    await manager.registerInitialAdmin({ email: 'admin@example.com', password: 'password123' });
    const login = await manager.login({ email: 'admin@example.com', password: 'password123' });
    await manager.changePassword(login.token, { currentPassword: 'password123', newPassword: 'new-password' });
    await expect(manager.authenticate(login.token)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(manager.login({ email: 'admin@example.com', password: 'new-password' })).resolves.toMatchObject({ user: { email: 'admin@example.com' } });
  });
});
