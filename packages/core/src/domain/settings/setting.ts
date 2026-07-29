import type { SettingKey } from '@kiban/shared';

export interface Setting { readonly key: SettingKey; readonly value: string; readonly updatedAt: Date; }
