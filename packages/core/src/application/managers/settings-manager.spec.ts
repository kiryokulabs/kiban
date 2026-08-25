import { describe, expect, it } from 'vitest';
import type { Setting } from '../../domain/settings/setting.js';
import type { SettingsRepository } from '../interfaces/settings-repository.js';
import type { SettingKey } from '@kiban/shared';
import { toSettingKey } from '@kiban/shared';
import { SettingsManager } from './settings-manager.js';

const now = new Date('2026-08-22T12:00:00.000Z');

class MemorySettingsRepository implements SettingsRepository {
  public readonly settings = new Map<string, Setting>();

  public async get(key: SettingKey): Promise<Setting | null> {
    return this.settings.get(key) ?? null;
  }

  public async set(setting: Setting): Promise<void> {
    this.settings.set(setting.key, setting);
  }

  public async list(): Promise<readonly Setting[]> {
    return [...this.settings.values()];
  }

  public async delete(key: SettingKey): Promise<void> {
    this.settings.delete(key);
  }
}

const createManager = () => {
  const repository = new MemorySettingsRepository();
  const manager = new SettingsManager(repository);
  return { manager, repository };
};

describe('SettingsManager', () => {
  it('reads a setting by key', async () => {
    const { manager, repository } = createManager();
    const key = toSettingKey('instance_domain');
    repository.settings.set(key, { key, value: 'kiban.example.com', updatedAt: now });

    const setting = await manager.getSetting(key);

    expect(setting).toMatchObject({ key, value: 'kiban.example.com' });
  });

  it('returns null when a setting does not exist', async () => {
    const { manager } = createManager();

    const setting = await manager.getSetting(toSettingKey('instance_domain'));

    expect(setting).toBeNull();
  });

  it('writes a setting by key and value', async () => {
    const { manager, repository } = createManager();
    const key = toSettingKey('instance_domain');

    await manager.setSetting(key, 'kiban.example.com');

    expect(repository.settings.get(key)?.value).toBe('kiban.example.com');
  });

  it('overwrites an existing setting value', async () => {
    const { manager, repository } = createManager();
    const key = toSettingKey('instance_domain');
    repository.settings.set(key, { key, value: 'old.example.com', updatedAt: now });

    await manager.setSetting(key, 'new.example.com');

    expect(repository.settings.get(key)?.value).toBe('new.example.com');
  });

  it('lists all persisted settings', async () => {
    const { manager, repository } = createManager();
    const keyA = toSettingKey('instance_domain');
    const keyB = toSettingKey('wildcard_domain');
    repository.settings.set(keyA, { key: keyA, value: 'kiban.example.com', updatedAt: now });
    repository.settings.set(keyB, { key: keyB, value: 'apps.example.com', updatedAt: now });

    const settings = await manager.listSettings();

    expect(settings).toHaveLength(2);
    expect(settings.map((s) => s.value)).toContain('kiban.example.com');
    expect(settings.map((s) => s.value)).toContain('apps.example.com');
  });

  it('clears a setting by key', async () => {
    const { manager, repository } = createManager();
    const key = toSettingKey('wildcard_domain');
    repository.settings.set(key, { key, value: 'apps.example.com', updatedAt: now });

    await manager.clearSetting(key);

    expect(repository.settings.has(key)).toBe(false);
  });

  it('rejects empty values when writing', async () => {
    const { manager } = createManager();

    await expect(manager.setSetting(toSettingKey('instance_domain'), '')).rejects.toThrow();
  });

  it('rejects whitespace-only values when writing', async () => {
    const { manager } = createManager();

    await expect(manager.setSetting(toSettingKey('instance_domain'), '   ')).rejects.toThrow();
  });
});
