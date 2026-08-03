export interface CatalogCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface CatalogItemDto {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly runtimeImage: string;
  readonly category: CatalogCategoryDto;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly icon: string;
}

export interface CatalogResponseDto {
  readonly categories: readonly CatalogCategoryDto[];
  readonly items: readonly CatalogItemDto[];
}
