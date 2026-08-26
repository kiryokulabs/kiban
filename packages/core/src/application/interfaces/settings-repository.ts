import type { Setting } from '../../domain/settings/setting.js';
import type { SettingKey } from '@kiban/shared';

export interface SettingsRepository { get(key: SettingKey): Promise<Setting | null>; set(setting: Setting): Promise<void>; delete(key: SettingKey): Promise<void>; list(): Promise<readonly Setting[]>; }
