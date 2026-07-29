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
}
