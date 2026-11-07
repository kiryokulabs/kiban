import { AdminRegistrationClosedError } from '@kiban/core';
import { Injectable } from '@nestjs/common';
import type { CreateAdminUserInput, CreateOperatorUserInput, User, UserRepository, UserRole, UserLoginActivity } from '@kiban/core';
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

interface UserActivityRow extends SqliteRow {
  readonly user_id: string;
  readonly last_login_at: number | null;
  readonly last_login_ip: string | null;
  readonly active_sessions: number;
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
    const created = await this.database.get<UserRow>(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') RETURNING *`,
      [user.id, user.email, user.passwordHash, user.role, user.createdAt, user.updatedAt]
    );
    if (!created) throw new AdminRegistrationClosedError();
    return this.toDomain(created);
  }


  /** Creates an operator user. */
  public async createOperator(input: CreateOperatorUserInput): Promise<User> {
    const now = new Date();
    const user: User = { id: randomUUID(), email: input.email, passwordHash: input.passwordHash, role: 'operator', createdAt: now, updatedAt: now };
    await this.database.run('INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [user.id, user.email, user.passwordHash, user.role, user.createdAt, user.updatedAt]);
    return user;
  }

  /** Lists all users ordered by creation date. */
  public async list(): Promise<readonly User[]> {
    const rows = await this.database.all<UserRow>('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map((row) => this.toDomain(row));
  }

  /** Reads metadata in one query; latest login survives logout and session expiry. */
  public async listActivity(now: Date): Promise<readonly UserLoginActivity[]> {
    const rows = await this.database.all<UserActivityRow>(`
      SELECT u.id AS user_id, latest.created_at AS last_login_at, latest.ip_address AS last_login_ip,
        (SELECT COUNT(*) FROM auth_sessions active
         WHERE active.user_id = u.id AND active.revoked_at IS NULL AND active.expires_at > ?) AS active_sessions
      FROM users u
      LEFT JOIN auth_sessions latest ON latest.id = (
        SELECT s.id FROM auth_sessions s WHERE s.user_id = u.id ORDER BY s.created_at DESC, s.rowid DESC LIMIT 1
      )
      ORDER BY u.created_at, u.id`, [now]);
    return rows.map(row => ({ userId: row.user_id, lastLoginAt: row.last_login_at === null ? null : new Date(row.last_login_at), lastLoginIp: row.last_login_ip, activeSessions: row.active_sessions }));
  }

  /** Deletes a user by id. */
  public async deleteById(id: string): Promise<void> {
    await this.database.run('DELETE FROM users WHERE id = ?', [id]);
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


  /** Upgrades a verified hash without overwriting a concurrent password change. */
  public async updatePasswordHash(userId: string, expectedHash: string, passwordHash: string, updatedAt: Date): Promise<boolean> {
    const updated = await this.database.get<{ readonly id: string }>(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND password_hash = ? RETURNING id',
      [passwordHash, updatedAt, userId, expectedHash]
    );
    return updated !== null;
  }

  /** Commits a password change and revocation together, or rolls both back. */
  public async changePasswordAndRevokeSessions(userId: string, expectedHash: string, passwordHash: string, updatedAt: Date): Promise<boolean> {
    const statements = [
      'BEGIN IMMEDIATE;',
      this.database.toStatement('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND password_hash = ? RETURNING id;', [passwordHash, updatedAt, userId, expectedHash]),
      this.database.toStatement('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND changes() = 1;', [updatedAt, userId]),
      'COMMIT;'
    ];
    const updated = await this.database.all<{ readonly id: string }>(statements.join('\n'));
    return updated.length === 1;
  }

  private toDomain(row: UserRow): User {
    return { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role as UserRole, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) };
  }
}
