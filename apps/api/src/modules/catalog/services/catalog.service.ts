import { Inject, Injectable } from '@nestjs/common';
import type { CatalogManager } from '@kiban/core';
import type { CatalogCategoryDto, CatalogItemDto, CatalogResponseDto } from '../dto/catalog.dto';
import { CATALOG_MANAGER } from '../interfaces/catalog.constants';
import { mapCatalogCategoryToDto, mapCatalogItemToDto } from '../mappers/catalog.mapper';

@Injectable()
export class CatalogService {
  public constructor(@Inject(CATALOG_MANAGER) private readonly catalog: CatalogManager) {}

  /** Lists the entire data-driven catalog. */
  public async list(query?: string): Promise<CatalogResponseDto> {
    const [categories, items] = await Promise.all([this.catalog.listCategories(), this.catalog.listItems()]);
    const normalizedQuery = query?.trim().toLowerCase() ?? '';
    const filteredItems = normalizedQuery
      ? items.filter((item) => `${item.name} ${item.description} ${item.category.name} ${item.id}`.toLowerCase().includes(normalizedQuery))
      : items;
    const visibleCategoryIds = new Set(filteredItems.map((item) => item.category.id));
    const visibleCategories = categories.filter((category) => visibleCategoryIds.has(category.id));
    return { categories: visibleCategories.map(mapCatalogCategoryToDto), items: filteredItems.map(mapCatalogItemToDto) };
  }

  /** Lists discovered categories. */
  public async listCategories(): Promise<readonly CatalogCategoryDto[]> {
    const categories = await this.catalog.listCategories();
    return categories.map(mapCatalogCategoryToDto);
  }

  /** Lists discovered service definitions. */
  public async listItems(query?: string): Promise<readonly CatalogItemDto[]> {
    return (await this.list(query)).items;
  }
}
