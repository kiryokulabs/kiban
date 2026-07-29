import type { CreateAdminUserInput, User } from '../../domain/users/user.js';

export interface UserRepository {
  /** Returns true when at least one admin user exists. */
  adminExists(): Promise<boolean>;
  /** Creates the first administrator user. */
  createAdmin(input: CreateAdminUserInput): Promise<User>;
  /** Finds a user by email address. */
  findByEmail(email: string): Promise<User | null>;
  /** Finds a user by identifier. */
  findById(id: string): Promise<User | null>;
  /** Updates a user's stored password hash. */
  updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<void>;
}
