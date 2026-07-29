import { Injectable } from '@nestjs/common';
import type { CreateAdminUserInput, User, UserRepository, UserRole } from '@kiban/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService, SqliteRow } from '../../../database/database.service';

interface UserRow extends SqliteRow {
  readonly id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly role: string;
  readonly created_at: number;
  readonly updated_at: number;
}

@Injectable()
export class SqliteUserRepository implements UserRepository {
  public constructor(private readonly database: DatabaseService) {}

  /** Returns true when an admin user exists. */
  public async adminExists(): Promise<boolean> {
    const row = await this.database.get<{ readonly count: number }>('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    return (row?.count ?? 0) > 0;
  }

  /** Creates the initial administrator. */
  public async createAdmin(input: CreateAdminUserInput): Promise<User> {
    const now = new Date();
    const user: User = { id: randomUUID(), email: input.email, passwordHash: input.passwordHash, role: 'admin', createdAt: now, updatedAt: now };
    await this.database.run('INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [user.id, user.email, user.passwordHash, user.role, user.createdAt, user.updatedAt]);
    return user;
  }

  /** Finds a user by normalized email. */
  public async findByEmail(email: string): Promise<User | null> {
    const row = await this.database.get<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return row ? this.toDomain(row) : null;
  }

  /** Finds a user by id. */
  public async findById(id: string): Promise<User | null> {
    const row = await this.database.get<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return row ? this.toDomain(row) : null;
  }


  /** Updates the stored password hash for a user. */
  public async updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<void> {
    await this.database.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, updatedAt, userId]);
  }

  private toDomain(row: UserRow): User {
    return { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role as UserRole, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) };
  }
}
