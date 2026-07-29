import type { AuthSession } from '../../domain/auth/auth-session.js';

export interface CreateAuthSessionInput {
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export interface AuthSessionRepository {
  /** Persists a new authenticated session. */
  create(input: CreateAuthSessionInput): Promise<AuthSession>;
  /** Finds a non-revoked session by hashed token. */
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<AuthSession | null>;
  /** Revokes a session by hashed token. */
  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
}
