import type { CatalogCategory, CatalogRepository, ServiceDefinition } from '@kiban/core';
import type { CatalogLoader } from './catalog.loader';

/**
 * Wraps CatalogLoader as a CatalogRepository.
 *
 * Loads and caches ServiceDefinitions on first access. Derives CatalogCategory
 * objects from the loaded definitions using title-cased category ids sorted
 * alphabetically. All category data flows from the catalog files themselves —
 * there is no separate category registry.
 */
export class CatalogLoaderRepository implements CatalogRepository {
  private cache: readonly ServiceDefinition[] | null = null;

  public constructor(private readonly loader: CatalogLoader) {}

  public async listItems(): Promise<readonly ServiceDefinition[]> {
    if (this.cache === null) {
      this.cache = await this.loader.load();
    }
    return this.cache;
  }

  public async listCategories(): Promise<readonly CatalogCategory[]> {
    const items = await this.listItems();
    const map = new Map<string, CatalogCategory>();
    for (const item of items) {
      if (!map.has(item.metadata.category)) {
        const id = item.metadata.category;
        map.set(id, { id, name: this.titleCase(id) });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Converts a hyphen-separated id such as "backend-platforms" into "Backend Platforms". */
  private titleCase(id: string): string {
    return id
      .split('-')
      .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
      .join(' ');
  }
}
