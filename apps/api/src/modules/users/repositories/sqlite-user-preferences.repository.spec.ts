import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../database/database.service';
import { SqliteUserPreferencesRepository } from './sqlite-user-preferences.repository';

const TEST_DB_DIR = `/tmp/kiban-test-user-preferences-${process.pid}`;

class TestDatabaseService extends DatabaseService {
  public constructor() {
    super();
    (this as unknown as { databasePath: string }).databasePath = `${TEST_DB_DIR}/test.sqlite`;
  }
}

describe('SqliteUserPreferencesRepository', () => {
  let repository: SqliteUserPreferencesRepository;

  beforeEach(async () => {
    const { mkdirSync, rmSync } = await import('node:fs');
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DB_DIR, { recursive: true });
    const database = new TestDatabaseService();
    await database.onModuleInit();
    repository = new SqliteUserPreferencesRepository(database);
  });

  it('returns null when the user has no preferences', async () => {
    await expect(repository.findByUserId('user-1')).resolves.toBeNull();
  });

  it('saves and updates a user theme', async () => {
    await repository.save('user-1', 'iron-copper', new Date('2026-10-18T12:00:00.000Z'));
    await repository.save('user-1', 'forest-sage', new Date('2026-10-18T13:00:00.000Z'));

    await expect(repository.findByUserId('user-1')).resolves.toMatchObject({ userId: 'user-1', theme: 'forest-sage' });
  });
});
