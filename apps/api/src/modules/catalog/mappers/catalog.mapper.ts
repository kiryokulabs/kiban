import type { CatalogCategory, CatalogItem } from '@kiban/core';
import type { CatalogCategoryDto, CatalogItemDto } from '../dto/catalog.dto';

/** Maps a catalog category to its API representation. */
export const mapCatalogCategoryToDto = (category: CatalogCategory): CatalogCategoryDto => category.description === undefined ? {
  id: category.id,
  name: category.name
} : {
  id: category.id,
  name: category.name,
  description: category.description
};

/** Maps a catalog item to its API representation without interpreting service-specific data. */
export const mapCatalogItemToDto = (item: CatalogItem): CatalogItemDto => ({
  id: item.id,
  name: item.name,
  description: item.description,
  version: item.version,
  author: item.author,
  category: mapCatalogCategoryToDto(item.category),
  metadata: item.metadata as unknown as Readonly<Record<string, unknown>>,
  compose: item.compose,
  schema: item.schema,
  icon: item.icon
});
