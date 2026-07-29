import type { InstalledPlugin } from '../../domain/plugins/installed-plugin.js';
import type { PluginId } from '@kiban/shared';

export interface PluginRepository { listInstalled(): Promise<readonly InstalledPlugin[]>; findInstalled(id: PluginId): Promise<InstalledPlugin | null>; saveInstalled(plugin: InstalledPlugin): Promise<void>; }
