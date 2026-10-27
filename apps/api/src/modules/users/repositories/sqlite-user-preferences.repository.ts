import { Injectable } from '@nestjs/common';
import type { UserPreferences, UserPreferencesRepository, UserTheme } from '@kiban/core';
import { DatabaseService, type SqliteRow } from '../../../database/database.service';

interface UserPreferencesRow extends SqliteRow {
  readonly user_id: string;
  readonly theme: string;
  readonly updated_at: number;
}

@Injectable()
export class SqliteUserPreferencesRepository implements UserPreferencesRepository {
  public constructor(private readonly database: DatabaseService) {}

  public async findByUserId(userId: string): Promise<UserPreferences | null> {
    const row = await this.database.get<UserPreferencesRow>('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [userId]);
    return row ? this.toDomain(row) : null;
  }

  public async save(userId: string, theme: UserTheme, updatedAt: Date): Promise<UserPreferences> {
    await this.database.run('INSERT INTO user_preferences (user_id, theme, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET theme = excluded.theme, updated_at = excluded.updated_at', [userId, theme, updatedAt]);
    return { userId, theme, updatedAt };
  }

  private toDomain(row: UserPreferencesRow): UserPreferences {
    return { userId: row.user_id, theme: row.theme as UserTheme, updatedAt: new Date(row.updated_at) };
  }
}
