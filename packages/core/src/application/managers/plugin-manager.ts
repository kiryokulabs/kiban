import type { InstalledPlugin } from '../../domain/plugins/installed-plugin.js';
import type { PluginRepository } from '../interfaces/plugin-repository.js';

/** Coordinates plugin installation state without depending on Docker or a plugin marketplace. */
export class PluginManager {
  public constructor(private readonly plugins: PluginRepository) {}

  /** Lists installed plugin records. */
  public listInstalledPlugins(): Promise<readonly InstalledPlugin[]> { return this.plugins.listInstalled(); }
}
