import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ALL_CATALOG_CATEGORIES, CatalogPagePresenter, type CatalogCategorySelection } from '../catalog/catalog-page.presenter';
import type { CatalogCategory, CatalogItem } from '../catalog/catalog.models';
import { CatalogService } from '../catalog/catalog.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-catalog-page',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <section class="space-y-6">
      <!-- Header -->
      <div class="card p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="flex items-center gap-2.5">
              <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
                <kiban-icon name="catalog" [size]="15" />
              </div>
              <h1 class="text-xl font-semibold kb-text">Service Catalog</h1>
            </div>
            <p class="mt-0.5 text-sm c-muted">Browse installable service definitions loaded from the filesystem.</p>
          </div>
          <div class="relative w-full lg:max-w-xs">
            <kiban-icon name="search" [size]="14" class="absolute left-3 top-1/2 -translate-y-1/2 c-subtle pointer-events-none" />
            <input name="catalogSearch" [(ngModel)]="query" (ngModelChange)="loadCatalog()" placeholder="PostgreSQL, Redis, AI..." class="input pl-9" />
          </div>
        </div>

        <!-- Categories -->
        <div class="mt-4 flex flex-wrap gap-1.5">
          <button type="button" class="btn text-xs px-2.5 py-1.5" [class.btn-primary]="selectedCategoryId() === allCategoryId" [class.btn-ghost]="selectedCategoryId() !== allCategoryId" (click)="selectCategory(allCategoryId)">
            All <span class="ml-1 opacity-70">{{ countForCategory(allCategoryId) }}</span>
          </button>
          @for (category of categories(); track category.id) {
            <button type="button" class="btn text-xs px-2.5 py-1.5" [class.btn-primary]="selectedCategoryId() === category.id" [class.btn-ghost]="selectedCategoryId() !== category.id" (click)="selectCategory(category.id)">
              {{ category.name }} <span class="ml-1 opacity-70">{{ countForCategory(category.id) }}</span>
            </button>
          }
        </div>
      </div>

      @if (message()) {
        <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
          <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
          <p class="text-sm c-muted">{{ message() }}</p>
        </div>
      }

      <!-- Section header -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold kb-text">{{ selectedCategoryName() }}</h2>
          <span class="text-xs c-subtle">({{ visibleItems().length }})</span>
        </div>
      </div>

      <!-- Grid -->
      @if (visibleItems().length === 0) {
        <div class="card flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand-light">
            <kiban-icon name="search" [size]="20" />
          </div>
          <p class="text-sm font-medium kb-text">No services found</p>
          <p class="mt-1 text-xs c-muted">Try another search or select a different category.</p>
        </div>
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (item of visibleItems(); track item.id) {
            <article class="card p-4 transition hover:border-brand/30 hover:bg-hover/30 group cursor-default">
              <div class="flex items-start gap-3">
                <div class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border kb-border bg-surface [&_svg]:h-6 [&_svg]:w-6" [innerHTML]="item.icon"></div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] uppercase tracking-wider c-subtle">{{ item.category.name }}</span>
                    <span class="badge text-[10px] px-1.5 py-0.5">v{{ item.version }}</span>
                  </div>
                  <h3 class="mt-0.5 text-sm font-medium kb-text">{{ item.name }}</h3>
                  <p class="mt-1 text-xs leading-relaxed c-muted line-clamp-2">{{ item.description }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between border-t kb-border pt-3 text-[11px] c-subtle">
                <span class="truncate max-w-[60%]">{{ imageLabel(item) }}</span>
                <span>{{ item.author }}</span>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `
})
export class CatalogPageComponent {
  private readonly catalog = inject(CatalogService);
  private readonly presenter = new CatalogPagePresenter();
  protected readonly allCategoryId = ALL_CATALOG_CATEGORIES;
  protected readonly categories = signal<readonly CatalogCategory[]>([]);
  protected readonly items = signal<readonly CatalogItem[]>([]);
  protected readonly selectedCategoryId = signal<CatalogCategorySelection>(ALL_CATALOG_CATEGORIES);
  protected readonly visibleItems = computed(() => this.presenter.visibleItems(this.items(), this.selectedCategoryId()));
  protected readonly message = signal<string | null>(null);
  protected query = '';

  public constructor() {
    this.loadCatalog();
  }

  protected loadCatalog(): void {
    this.catalog.list(this.query).subscribe({
      next: (catalog) => {
        this.categories.set(catalog.categories);
        this.items.set(catalog.items);
        this.ensureSelectedCategoryStillExists();
        this.message.set(null);
      },
      error: () => this.message.set('Could not load the service catalog.')
    });
  }

  protected selectCategory(categoryId: CatalogCategorySelection): void {
    this.selectedCategoryId.set(categoryId);
  }

  protected countForCategory(categoryId: CatalogCategorySelection): number {
    return this.presenter.countForCategory(this.items(), categoryId);
  }

  protected selectedCategoryName(): string {
    if (this.selectedCategoryId() === ALL_CATALOG_CATEGORIES) {
      return 'All services';
    }
    return this.categories().find((category) => category.id === this.selectedCategoryId())?.name ?? 'Services';
  }

  protected imageLabel(item: CatalogItem): string {
    const docker = item.metadata['docker'];
    if (!docker || typeof docker !== 'object' || Array.isArray(docker)) {
      return item.id;
    }
    const image = (docker as Readonly<Record<string, unknown>>)['image'];
    return typeof image === 'string' ? image : item.id;
  }

  private ensureSelectedCategoryStillExists(): void {
    if (this.selectedCategoryId() === ALL_CATALOG_CATEGORIES) {
      return;
    }
    const exists = this.categories().some((category) => category.id === this.selectedCategoryId());
    if (!exists) {
      this.selectedCategoryId.set(ALL_CATALOG_CATEGORIES);
    }
  }
}
