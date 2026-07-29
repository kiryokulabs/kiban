import type { User } from '../users/user.js';

export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly revokedAt?: Date;
}

export interface AuthenticatedSession {
  readonly user: User;
  readonly session: AuthSession;
}

export interface LoginResult {
  readonly token: string;
  readonly expiresAt: Date;
  readonly user: User;
}
