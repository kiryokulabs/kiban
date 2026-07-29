import type { PluginManifest } from '@kiban/plugin-sdk';

export interface CatalogCategory { readonly id: string; readonly name: string; readonly description?: string; }
export interface CatalogItem { readonly manifest: PluginManifest; readonly category: CatalogCategory; }
