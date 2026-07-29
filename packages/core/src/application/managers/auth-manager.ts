import type { AuthenticatedSession, LoginResult } from '../../domain/auth/auth-session.js';
import { AdminRegistrationClosedError, InvalidCredentialsError, UnauthenticatedError } from '../../domain/auth/auth-errors.js';
import type { PublicUser, User } from '../../domain/users/user.js';
import type { AuthSessionRepository } from '../interfaces/auth-session-repository.js';
import type { PasswordHasher } from '../interfaces/password-hasher.js';
import type { SessionTokenService } from '../interfaces/session-token-service.js';
import type { UserRepository } from '../interfaces/user-repository.js';

export interface BootstrapStatus { readonly requiresAdminSetup: boolean; }
export interface RegisterAdminInput { readonly email: string; readonly password: string; }
export interface LoginInput { readonly email: string; readonly password: string; }

export interface AuthManagerOptions { readonly sessionTtlMs: number; readonly now: () => Date; }

/** Coordinates authentication use cases without depending on HTTP, cookies or persistence technology. */
export class AuthManager {
  public constructor(
    private readonly users: UserRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: SessionTokenService,
    private readonly options: AuthManagerOptions
  ) {}

  /** Returns whether this installation still needs the initial admin account. */
  public async getBootstrapStatus(): Promise<BootstrapStatus> {
    return { requiresAdminSetup: !(await this.users.adminExists()) };
  }

  /** Creates the first admin user; closed forever after one admin exists. */
  public async registerInitialAdmin(input: RegisterAdminInput): Promise<PublicUser> {
    if (await this.users.adminExists()) {
      throw new AdminRegistrationClosedError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.createAdmin({ email: this.normalizeEmail(input.email), passwordHash });
    return this.toPublicUser(user);
  }

  /** Authenticates a user and creates an opaque session token. */
  public async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(this.normalizeEmail(input.email));
    if (!user || !(await this.passwordHasher.verify(input.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const token = await this.tokenService.createToken();
    const tokenHash = await this.tokenService.hashToken(token);
    const expiresAt = new Date(this.options.now().getTime() + this.options.sessionTtlMs);
    await this.sessions.create({ userId: user.id, tokenHash, expiresAt });
    return { token, expiresAt, user };
  }

  /** Revokes the session represented by an opaque token. */
  public async logout(token: string): Promise<void> {
    await this.sessions.revokeByTokenHash(await this.tokenService.hashToken(token), this.options.now());
  }

  /** Resolves the authenticated session represented by an opaque token. */
  public async authenticate(token: string | null): Promise<AuthenticatedSession> {
    if (!token) {
      throw new UnauthenticatedError();
    }

    const session = await this.sessions.findActiveByTokenHash(await this.tokenService.hashToken(token), this.options.now());
    if (!session) {
      throw new UnauthenticatedError();
    }

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new UnauthenticatedError();
    }

    return { user, session };
  }

  /** Converts a user into a safe API shape. */
  public toPublicUser(user: User): PublicUser {
    return { id: user.id, email: user.email, role: user.role };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
