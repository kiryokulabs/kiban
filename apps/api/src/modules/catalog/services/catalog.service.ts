import { Inject, Injectable } from '@nestjs/common';
import type { CatalogManager, ServiceDefinition } from '@kiban/core';
import type { CatalogCategoryDto, CatalogItemDto, CatalogResponseDto } from '../dto/catalog.dto';
import { CATALOG_MANAGER } from '../interfaces/catalog.constants';
import { mapCatalogCategoryToDto, mapCatalogItemToDto } from '../mappers/catalog.mapper';

@Injectable()
export class CatalogService {
  public constructor(@Inject(CATALOG_MANAGER) private readonly catalog: CatalogManager) {}

  /** Lists the entire data-driven catalog, optionally filtered by a query string. */
  public async list(query?: string): Promise<CatalogResponseDto> {
    const [categories, items] = await Promise.all([
      this.catalog.listCategories(),
      this.catalog.listItems()
    ]);

    const categoryMap = new Map<string, CatalogCategoryDto>(
      categories.map((c) => [c.id, mapCatalogCategoryToDto(c)])
    );

    const normalizedQuery = query?.trim().toLowerCase() ?? '';
    const filteredItems = normalizedQuery
      ? items.filter((item) => {
          const cat = categoryMap.get(item.metadata.category);
          return `${item.metadata.name} ${item.metadata.description} ${cat?.name ?? item.metadata.category} ${item.id}`
            .toLowerCase()
            .includes(normalizedQuery);
        })
      : items;

    const visibleCategoryIds = new Set(filteredItems.map((item) => item.metadata.category));
    const visibleCategories = categories.filter((category) => visibleCategoryIds.has(category.id));

    return {
      categories: visibleCategories.map(mapCatalogCategoryToDto),
      items: filteredItems.map((item) =>
        mapCatalogItemToDto(
          item,
          categoryMap.get(item.metadata.category) ?? { id: item.metadata.category, name: item.metadata.category }
        )
      )
    };
  }

  /** Lists discovered categories. */
  public async listCategories(): Promise<readonly CatalogCategoryDto[]> {
    const categories = await this.catalog.listCategories();
    return categories.map(mapCatalogCategoryToDto);
  }

  /** Lists discovered service definitions as DTOs, optionally filtered by query. */
  public async listItems(query?: string): Promise<readonly CatalogItemDto[]> {
    return (await this.list(query)).items;
  }

  /** Lists raw ServiceDefinitions — used internally by other modules that need typed access points. */
  public async listServiceDefinitions(): Promise<readonly ServiceDefinition[]> {
    return this.catalog.listItems();
  }
}
