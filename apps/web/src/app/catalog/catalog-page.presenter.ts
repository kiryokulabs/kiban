import type { ProjectDetails } from '../projects/projects.models';
import type { CatalogItem } from './catalog.models';

export const ALL_CATALOG_CATEGORIES = 'all';
export type CatalogCategorySelection = typeof ALL_CATALOG_CATEGORIES | string;

export interface CatalogInstallTarget {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly environmentId: string;
  readonly environmentName: string;
}

export interface CatalogInstallTargetGroup {
  readonly projectId: string;
  readonly projectName: string;
  readonly targets: readonly CatalogInstallTarget[];
}

/** Presentation rules for the data-driven Catalog page. */
export class CatalogPagePresenter {
  /** Returns services visible for the current category selection. */
  public visibleItems(items: readonly CatalogItem[], selectedCategoryId: CatalogCategorySelection): readonly CatalogItem[] {
    if (selectedCategoryId === ALL_CATALOG_CATEGORIES) {
      return items;
    }
    return items.filter((item) => item.category.id === selectedCategoryId);
  }

  /** Returns catalog services for a category, unless a search query is active. */
  public visibleItemsForSearch(
    items: readonly CatalogItem[],
    selectedCategoryId: CatalogCategorySelection,
    query: string
  ): readonly CatalogItem[] {
    const normalizedQuery = query.trim().toLowerCase();
    const searched = normalizedQuery.length === 0
      ? items
      : items.filter((item) => `${item.name} ${item.description} ${item.runtimeImage}`.toLowerCase().includes(normalizedQuery));
    return normalizedQuery.length > 0 ? searched : this.visibleItems(searched, selectedCategoryId);
  }

  /** Counts services for a category selector item. */
  public countForCategory(items: readonly CatalogItem[], categoryId: CatalogCategorySelection): number {
    return this.visibleItems(items, categoryId).length;
  }

  /** Flattens every project environment into a selectable install target. */
  public installTargets(projects: readonly ProjectDetails[]): readonly CatalogInstallTarget[] {
    return projects.flatMap((project) => project.environments.map((environment) => ({
      id: this.targetId(project.id, environment.id),
      projectId: project.id,
      projectName: project.name,
      environmentId: environment.id,
      environmentName: environment.name
    })));
  }

  /** Groups install targets by project for the catalog install modal. */
  public installTargetGroups(projects: readonly ProjectDetails[]): readonly CatalogInstallTargetGroup[] {
    return projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      targets: this.installTargets([project])
    }));
  }

  /** Toggles one target id while preserving immutable signal state. */
  public toggleTarget(current: ReadonlySet<string>, targetId: string): ReadonlySet<string> {
    const next = new Set(current);
    if (next.has(targetId)) {
      next.delete(targetId);
    } else {
      next.add(targetId);
    }
    return next;
  }

  /** Resolves selected ids into concrete project/environment install requests. */
  public selectedInstallTargets(projects: readonly ProjectDetails[], selectedTargetIds: ReadonlySet<string>): readonly CatalogInstallTarget[] {
    return this.installTargets(projects).filter((target) => selectedTargetIds.has(target.id));
  }

  private targetId(projectId: string, environmentId: string): string {
    return `${projectId}:${environmentId}`;
  }
}
