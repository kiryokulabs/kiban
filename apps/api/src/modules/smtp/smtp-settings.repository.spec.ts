import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { SmtpSettings } from '@kiban/core';
import { toSettingKey } from '@kiban/shared';
import { DatabaseService } from '../../database/database.service';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';
import { SmtpSettingsCipher } from './smtp-settings-cipher';
import { EncryptedSmtpSettingsRepository } from './smtp-settings.repository';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('Isolated SMTP persistence', () => {
  it('persists encrypted settings across restarts without changing any domain or TLS setting', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kiban-smtp-db-'));
    directories.push(directory);
    const database = new DatabaseService({ databasePath: join(directory, 'test.sqlite') });
    await database.onModuleInit();
    const settings = new SqliteSettingsRepository(database);
    const original = ['instance_domain', 'wildcard_domain', 'tls_acme_email', 'tls_acme_staging'];
    for (const key of original) await settings.set({ key: toSettingKey(key), value: `${key}-unchanged`, updatedAt: new Date(123456) });
    const before = await settings.list();
    const keyPath = join(directory, 'config', 'smtp.key');
    const repository = new EncryptedSmtpSettingsRepository(settings, new SmtpSettingsCipher(keyPath));
    expect(await repository.get()).toBeNull();
    expect(existsSync(keyPath)).toBe(false);
    const input: SmtpSettings = { host: 'localhost', port: 1025, security: 'none', username: '', password: null, fromName: 'Kiban', fromEmail: 'kiban@example.com' };
    await repository.save({ ...input, security: 'starttls', username: 'smtp-user', password: 'private-password' });
    const row = await settings.get(toSettingKey('smtp'));
    expect(row?.value).not.toContain('private-password');
    expect(row?.value).not.toContain('smtp-user');
    expect(await new EncryptedSmtpSettingsRepository(settings, new SmtpSettingsCipher(keyPath)).get()).toMatchObject({ username: 'smtp-user', password: 'private-password' });
    expect((await settings.list()).filter((row) => original.includes(row.key))).toEqual(before);
    await repository.save(input);
    expect(await repository.get()).toEqual(input);
    expect((await settings.list()).filter((row) => original.includes(row.key))).toEqual(before);
  });
});
