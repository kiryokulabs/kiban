import type { CreateAdminUserInput, CreateOperatorUserInput, User } from '../../domain/users/user.js';

export interface UserRepository {
  /** Returns true when at least one admin user exists. */
  adminExists(): Promise<boolean>;
  /** Creates the first administrator user. */
  createAdmin(input: CreateAdminUserInput): Promise<User>;
  /** Creates an operator user managed by the administrator. */
  createOperator(input: CreateOperatorUserInput): Promise<User>;
  /** Lists all users in the installation. */
  list(): Promise<readonly User[]>;
  /** Deletes a user by identifier. */
  deleteById(id: string): Promise<void>;
  /** Finds a user by email address. */
  findByEmail(email: string): Promise<User | null>;
  /** Finds a user by identifier. */
  findById(id: string): Promise<User | null>;
  /** Updates a user's stored password hash. */
  updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<void>;
}
