import type { CatalogCategory, CatalogItem } from '../../domain/catalog/catalog-item.js';
import type { CatalogRepository } from '../interfaces/catalog-repository.js';

/** Coordinates catalog read use cases through a catalog repository interface. */
export class CatalogManager {
  public constructor(private readonly catalog: CatalogRepository) {}

  /** Lists available catalog categories. */
  public listCategories(): Promise<readonly CatalogCategory[]> { return this.catalog.listCategories(); }
  /** Lists available catalog items. */
  public listItems(): Promise<readonly CatalogItem[]> { return this.catalog.listItems(); }
}
