export interface CategorySliderSource {
  readonly id: string;
  readonly name: string;
}

export interface CategorySliderItem {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/** Builds the shared category slider model used by catalog surfaces. */
export class CategorySliderPresenter {
  /** Returns the "All" option followed by every category with its service count. */
  public items(
    allId: string,
    categories: readonly CategorySliderSource[],
    countForCategory: (categoryId: string) => number
  ): readonly CategorySliderItem[] {
    return [
      { id: allId, label: 'All', count: countForCategory(allId) },
      ...categories.map((category) => ({ id: category.id, label: category.name, count: countForCategory(category.id) }))
    ];
  }
}
