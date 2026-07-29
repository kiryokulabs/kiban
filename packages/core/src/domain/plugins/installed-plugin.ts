import type { PluginId } from '@kiban/shared';
import type { PluginManifest } from '@kiban/plugin-sdk';

export interface InstalledPlugin { readonly id: PluginId; readonly manifest: PluginManifest; readonly installedAt: Date; readonly enabled: boolean; }
