import type { CatalogCategory, ServiceDefinition } from '@kiban/core';
import type { CatalogCategoryDto, CatalogItemDto } from '../dto/catalog.dto';

/** Maps a catalog category to its API representation. */
export const mapCatalogCategoryToDto = (category: CatalogCategory): CatalogCategoryDto =>
  category.description === undefined
    ? { id: category.id, name: category.name }
    : { id: category.id, name: category.name, description: category.description };

/**
 * Maps a ServiceDefinition to its API representation.
 *
 * Requires a pre-resolved category DTO since ServiceDefinition only carries the
 * category id string — the full category (with title-cased name) lives in the
 * repository layer.
 */
const primaryRuntimeImage = (item: ServiceDefinition): string => {
  const service = item.runtime.services[0];
  return service ? `${service.image}:${service.tag}` : 'unknown';
};

export const mapCatalogItemToDto = (item: ServiceDefinition, category: CatalogCategoryDto): CatalogItemDto => ({
  id: item.id,
  name: item.metadata.name,
  description: item.metadata.description,
  author: item.metadata.author,
  runtimeImage: primaryRuntimeImage(item),
  category,
  metadata: item.metadata as unknown as Readonly<Record<string, unknown>>,
  schema: item.schema,
  icon: item.icon
});
