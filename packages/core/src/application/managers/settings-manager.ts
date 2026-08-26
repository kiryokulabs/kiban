import type { Setting } from '../../domain/settings/setting.js';
import type { SettingsRepository } from '../interfaces/settings-repository.js';
import type { SettingKey } from '@kiban/shared';

/** Coordinates settings use cases without knowing how settings are stored. */
export class SettingsManager {
  public constructor(private readonly settings: SettingsRepository) {}

  /** Reads a setting by key. */
  public getSetting(key: SettingKey): Promise<Setting | null> { return this.settings.get(key); }

  /** Lists all persisted settings. */
  public listSettings(): Promise<readonly Setting[]> { return this.settings.list(); }

  /** Clears a setting by key. */
  public clearSetting(key: SettingKey): Promise<void> { return this.settings.delete(key); }

  /** Writes a setting by key and value, rejecting empty values. */
  public async setSetting(key: SettingKey, value: string): Promise<void> {
    if (!value || value.trim().length === 0) {
      throw new Error('Setting value must not be empty.');
    }
    await this.settings.set({ key, value: value.trim(), updatedAt: new Date() });
  }
}
