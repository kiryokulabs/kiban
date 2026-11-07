import type { AuthSession } from '../../domain/auth/auth-session.js';

export interface CreateAuthSessionInput {
  readonly userId: string;
  /** Backend-observed client IP. Absent for sessions created before activity recording. */
  readonly ipAddress?: string | null;
  /** Password hash verified by login; prevents issuing sessions for stale credentials. */
  readonly passwordHash: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export interface AuthSessionRepository {
  /** Persists a new authenticated session. */
  create(input: CreateAuthSessionInput): Promise<AuthSession | null>;
  /** Finds a non-revoked session by hashed token. */
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<AuthSession | null>;
  /** Revokes a session by hashed token. */
  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
}
