import type { CatalogCategory, CatalogItem } from '../../domain/catalog/catalog-item.js';

export interface CatalogRepository { listCategories(): Promise<readonly CatalogCategory[]>; listItems(): Promise<readonly CatalogItem[]>; }
