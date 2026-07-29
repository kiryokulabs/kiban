export interface PluginPortManifest { readonly name: string; readonly port: number; readonly protocol: 'tcp' | 'udp'; readonly public?: boolean; }
export interface PluginVolumeManifest { readonly name: string; readonly mountPath: string; readonly persistent: boolean; }
export interface PluginEnvironmentManifest { readonly key: string; readonly description?: string; readonly required: boolean; readonly defaultValue?: string; }
export interface PluginDockerManifest { readonly image: string; readonly tag?: string; readonly registry?: string; }
export interface PluginHealthcheckManifest { readonly type: 'http' | 'tcp' | 'command'; readonly target: string; readonly intervalSeconds?: number; readonly timeoutSeconds?: number; }

/** Static metadata that describes a plugin without executing plugin code. */
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly category: string;
  readonly icon?: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly docker?: PluginDockerManifest;
  readonly ports?: readonly PluginPortManifest[];
  readonly volumes?: readonly PluginVolumeManifest[];
  readonly environment?: readonly PluginEnvironmentManifest[];
  readonly healthcheck?: PluginHealthcheckManifest;
  readonly minimumVersion: string;
}
