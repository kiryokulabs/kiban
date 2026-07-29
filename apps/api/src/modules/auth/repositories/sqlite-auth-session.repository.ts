import { Injectable } from '@nestjs/common';
import type { AuthSession, AuthSessionRepository, CreateAuthSessionInput } from '@kiban/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService, SqliteRow } from '../../../database/database.service';

interface AuthSessionRow extends SqliteRow {
  readonly id: string;
  readonly user_id: string;
  readonly token_hash: string;
  readonly expires_at: number;
  readonly created_at: number;
  readonly revoked_at: number | null;
}

@Injectable()
export class SqliteAuthSessionRepository implements AuthSessionRepository {
  public constructor(private readonly database: DatabaseService) {}

  /** Creates a persisted session row. */
  public async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session: AuthSession = { id: randomUUID(), userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt, createdAt: new Date() };
    await this.database.run('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)', [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt]);
    return session;
  }

  /** Finds a valid non-expired non-revoked session by token hash. */
  public async findActiveByTokenHash(tokenHash: string, now: Date): Promise<AuthSession | null> {
    const row = await this.database.get<AuthSessionRow>('SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ? AND revoked_at IS NULL LIMIT 1', [tokenHash, now]);
    return row ? this.toDomain(row) : null;
  }

  /** Revokes the session matching a token hash. */
  public async revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.database.run('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?', [revokedAt, tokenHash]);
  }

  private toDomain(row: AuthSessionRow): AuthSession {
    const base = { id: row.id, userId: row.user_id, tokenHash: row.token_hash, expiresAt: new Date(row.expires_at), createdAt: new Date(row.created_at) };
    return row.revoked_at ? { ...base, revokedAt: new Date(row.revoked_at) } : base;
  }
}
