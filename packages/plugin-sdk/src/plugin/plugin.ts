export type PluginRuntimeStatus = 'not-installed' | 'installed' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
export type PluginHealthStatus = 'unknown' | 'healthy' | 'unhealthy' | 'degraded';

export interface PluginLogQuery { readonly tail?: number; readonly since?: Date; }
export interface PluginConfiguration { readonly values: Readonly<Record<string, string | number | boolean | null>>; }
export interface PluginStatus { readonly status: PluginRuntimeStatus; readonly message?: string; }
export interface PluginHealth { readonly status: PluginHealthStatus; readonly checkedAt: Date; readonly message?: string; }

/** Generic contract implemented by every future Kiban plugin. */
export interface Plugin {
  /** Installs required plugin resources through host-provided ports. */
  install(): Promise<void>;
  /** Removes plugin resources created during installation. */
  uninstall(): Promise<void>;
  /** Starts the plugin service. */
  start(): Promise<void>;
  /** Stops the plugin service. */
  stop(): Promise<void>;
  /** Restarts the plugin service. */
  restart(): Promise<void>;
  /** Returns runtime status without leaking infrastructure details. */
  status(): Promise<PluginStatus>;
  /** Returns health information suitable for UI and API consumers. */
  health(): Promise<PluginHealth>;
  /** Streams or returns plugin logs through an abstract transport. */
  logs(query?: PluginLogQuery): AsyncIterable<string>;
  /** Returns the plugin configuration model. */
  configuration(): Promise<PluginConfiguration>;
}
