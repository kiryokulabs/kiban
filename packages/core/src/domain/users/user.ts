export type UserRole = 'admin' | 'operator';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PublicUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface CreateAdminUserInput {
  readonly email: string;
  readonly passwordHash: string;
}

export interface CreateOperatorUserInput {
  readonly email: string;
  readonly passwordHash: string;
}

/** Safe per-account login summary. Session credentials are intentionally excluded. */
export interface UserLoginActivity {
  readonly userId: string;
  readonly lastLoginAt: Date | null;
  readonly lastLoginIp: string | null;
  readonly activeSessions: number;
}
