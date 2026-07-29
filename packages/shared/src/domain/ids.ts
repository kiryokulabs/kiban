/** Branded identifier for projects. */
export type ProjectId = string & { readonly __brand: 'ProjectId' };
/** Branded identifier for plugins. */
export type PluginId = string & { readonly __brand: 'PluginId' };
/** Branded identifier for settings. */
export type SettingKey = string & { readonly __brand: 'SettingKey' };

/** Creates a project id without leaking the brand implementation. */
export const toProjectId = (value: string): ProjectId => value as ProjectId;
/** Creates a plugin id without leaking the brand implementation. */
export const toPluginId = (value: string): PluginId => value as PluginId;
/** Creates a setting key without leaking the brand implementation. */
export const toSettingKey = (value: string): SettingKey => value as SettingKey;
