import { Inject, Injectable } from '@nestjs/common';
import type { Setting } from '@kiban/core';
import type { SettingKey } from '@kiban/shared';
import { toSettingKey } from '@kiban/shared';
import { DatabaseService, type SqliteRow } from '../../../database/database.service';

interface SettingRow extends SqliteRow {
  readonly key: string;
  readonly value: string;
  readonly updated_at: number;
}

/** SQLite implementation of the settings repository. */
@Injectable()
export class SqliteSettingsRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Reads a setting by key. */
  public async get(key: SettingKey): Promise<Setting | null> {
    const row = await this.database.get<SettingRow>('SELECT * FROM settings WHERE key = ? LIMIT 1', [key]);
    return row ? this.toSetting(row) : null;
  }

  /** Writes or overwrites a setting. */
  public async set(setting: Setting): Promise<void> {
    await this.database.run(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      [setting.key, setting.value, setting.updatedAt]
    );
  }

  /** Deletes a setting by key. */
  public async delete(key: SettingKey): Promise<void> {
    await this.database.run('DELETE FROM settings WHERE key = ?', [key]);
  }

  /** Lists all persisted settings. */
  public async list(): Promise<readonly Setting[]> {
    const rows = await this.database.all<SettingRow>('SELECT * FROM settings ORDER BY key ASC');
    return rows.map((row) => this.toSetting(row));
  }

  private toSetting(row: SettingRow): Setting {
    return { key: toSettingKey(row.key), value: row.value, updatedAt: new Date(row.updated_at) };
  }
}
