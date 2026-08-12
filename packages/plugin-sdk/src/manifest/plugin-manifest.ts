export interface PluginPortManifest { readonly name: string; readonly port: number; readonly protocol: 'tcp' | 'udp'; readonly public?: boolean; }
export interface PluginVolumeManifest { readonly name: string; readonly mountPath: string; readonly persistent: boolean; }
export interface PluginEnvironmentManifest { readonly key: string; readonly description?: string; readonly required: boolean; readonly defaultValue?: string; }
export interface PluginDockerManifest { readonly image: string; readonly tag?: string; readonly registry?: string; }
export interface PluginHealthcheckManifest { readonly type: 'http' | 'tcp' | 'command'; readonly target: string; readonly intervalSeconds?: number; readonly timeoutSeconds?: number; }

/** Describes how credentials map from environment variables to a connection URI. */
export interface PluginAccessPointCredentialMapping {
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
}

/** A network access point that a service exposes to users. */
export interface PluginAccessPointManifest {
  readonly name: string;
  readonly type: 'web' | 'database';
  readonly protocol?: string;
  readonly port: number;
  readonly credentials?: PluginAccessPointCredentialMapping;
}

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
  readonly accessPoints?: readonly PluginAccessPointManifest[];
  readonly minimumVersion: string;
}
