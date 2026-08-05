import type { CatalogCategory } from '../../domain/catalog/catalog-item.js';
import type { ServiceDefinition } from '../../domain/catalog/service-definition.js';

export interface CatalogRepository {
  listCategories(): Promise<readonly CatalogCategory[]>;
  listItems(): Promise<readonly ServiceDefinition[]>;
}
