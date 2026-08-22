import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../database/database.service';
import { SqliteSettingsRepository } from './sqlite-settings.repository.js';
import { toSettingKey } from '@kiban/shared';
import type { SettingKey } from '@kiban/shared';

const TEST_DB_DIR = `/tmp/kiban-test-settings-${process.pid}`;

class TestDatabaseService extends DatabaseService {
  public constructor() {
    super();
    // Override the database path to use a temp directory
    (this as unknown as { databasePath: string }).databasePath = `${TEST_DB_DIR}/test.sqlite`;
  }
}

describe('SqliteSettingsRepository', () => {
  let repository: SqliteSettingsRepository;
  let database: TestDatabaseService;

  beforeEach(async () => {
    const { mkdirSync, rmSync } = await import('node:fs');
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DB_DIR, { recursive: true });
    database = new TestDatabaseService();
    await database.onModuleInit();
    repository = new SqliteSettingsRepository(database);
  });

  const key: SettingKey = toSettingKey('instance_domain');

  it('returns null when a setting does not exist', async () => {
    const setting = await repository.get(key);

    expect(setting).toBeNull();
  });

  it('writes and reads a setting', async () => {
    await repository.set({ key, value: 'kiban.example.com', updatedAt: new Date('2026-08-22T12:00:00.000Z') });

    const setting = await repository.get(key);

    expect(setting).toMatchObject({ key: 'instance_domain', value: 'kiban.example.com' });
  });

  it('overwrites an existing setting', async () => {
    await repository.set({ key, value: 'old.example.com', updatedAt: new Date() });
    await repository.set({ key, value: 'new.example.com', updatedAt: new Date() });

    const setting = await repository.get(key);

    expect(setting?.value).toBe('new.example.com');
  });

  it('lists all persisted settings', async () => {
    const keyA = toSettingKey('instance_domain');
    const keyB = toSettingKey('wildcard_domain');
    await repository.set({ key: keyA, value: 'kiban.example.com', updatedAt: new Date() });
    await repository.set({ key: keyB, value: 'apps.example.com', updatedAt: new Date() });

    const settings = await repository.list();

    expect(settings).toHaveLength(2);
    expect(settings.map((s) => s.value)).toContain('kiban.example.com');
    expect(settings.map((s) => s.value)).toContain('apps.example.com');
  });
});
