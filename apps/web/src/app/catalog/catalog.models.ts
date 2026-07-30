export interface CatalogCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface CatalogItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly category: CatalogCategory;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly compose: string;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly icon: string;
}

export interface CatalogResponse {
  readonly categories: readonly CatalogCategory[];
  readonly items: readonly CatalogItem[];
}
