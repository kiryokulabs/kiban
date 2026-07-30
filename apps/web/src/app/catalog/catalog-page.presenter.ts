import type { CatalogItem } from './catalog.models';

export const ALL_CATALOG_CATEGORIES = 'all';
export type CatalogCategorySelection = typeof ALL_CATALOG_CATEGORIES | string;

/** Presentation rules for the data-driven Catalog page. */
export class CatalogPagePresenter {
  /** Returns services visible for the current category selection. */
  public visibleItems(items: readonly CatalogItem[], selectedCategoryId: CatalogCategorySelection): readonly CatalogItem[] {
    if (selectedCategoryId === ALL_CATALOG_CATEGORIES) {
      return items;
    }
    return items.filter((item) => item.category.id === selectedCategoryId);
  }

  /** Counts services for a category selector item. */
  public countForCategory(items: readonly CatalogItem[], categoryId: CatalogCategorySelection): number {
    return this.visibleItems(items, categoryId).length;
  }
}
