export type UserRole = 'admin';

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
