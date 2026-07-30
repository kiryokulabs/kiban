import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ALL_CATALOG_CATEGORIES, CatalogPagePresenter, type CatalogCategorySelection } from '../catalog/catalog-page.presenter';
import type { CatalogCategory, CatalogItem } from '../catalog/catalog.models';
import { CatalogService } from '../catalog/catalog.service';

@Component({
  selector: 'kiban-catalog-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="space-y-8">
      <div class="rounded-2xl border kb-border kb-panel p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="mb-3 text-sm font-medium kb-muted">Catalog</p>
            <h1 class="text-3xl font-semibold tracking-tight kb-text">Service Catalog</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 kb-muted">Browse installable service definitions loaded directly from the filesystem catalog. Categories, icons, names and images all come from service folders.</p>
          </div>
          <label class="block w-full lg:max-w-sm text-sm">
            <span class="mb-2 block kb-muted">Search services</span>
            <input name="catalogSearch" [(ngModel)]="query" (ngModelChange)="loadCatalog()" placeholder="PostgreSQL, Redis, AI..." class="w-full rounded-xl border kb-border bg-surface px-4 py-3 kb-text outline-none transition focus:border-zinc-400" />
          </label>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          <button type="button" class="rounded-full border px-4 py-2 text-sm transition" [class.border-zinc-100]="selectedCategoryId() === allCategoryId" [class.bg-zinc-100]="selectedCategoryId() === allCategoryId" [class.text-zinc-950]="selectedCategoryId() === allCategoryId" [class.kb-border]="selectedCategoryId() !== allCategoryId" [class.kb-muted]="selectedCategoryId() !== allCategoryId" (click)="selectCategory(allCategoryId)">
            All <span class="ml-2 opacity-70">{{ countForCategory(allCategoryId) }}</span>
          </button>
          @for (category of categories(); track category.id) {
            <button type="button" class="rounded-full border px-4 py-2 text-sm transition" [class.border-zinc-100]="selectedCategoryId() === category.id" [class.bg-zinc-100]="selectedCategoryId() === category.id" [class.text-zinc-950]="selectedCategoryId() === category.id" [class.kb-border]="selectedCategoryId() !== category.id" [class.kb-muted]="selectedCategoryId() !== category.id" (click)="selectCategory(category.id)">
              {{ category.name }} <span class="ml-2 opacity-70">{{ countForCategory(category.id) }}</span>
            </button>
          }
        </div>
      </div>

      @if (message()) {
        <p class="rounded-lg border kb-border kb-panel px-3 py-2 text-sm kb-muted">{{ message() }}</p>
      }

      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold kb-text">{{ selectedCategoryName() }}</h2>
          <p class="mt-1 text-sm kb-muted">{{ visibleItems().length }} services available</p>
        </div>
      </div>

      @if (visibleItems().length === 0) {
        <div class="rounded-2xl border kb-border kb-panel p-10 text-center">
          <p class="font-medium kb-text">No services found</p>
          <p class="mt-2 text-sm kb-muted">Try another search or select All.</p>
        </div>
      } @else {
        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          @for (item of visibleItems(); track item.id) {
            <article class="group rounded-2xl border kb-border kb-panel p-5 transition hover:-translate-y-0.5 hover:border-zinc-500/70">
              <div class="flex items-start gap-4">
                <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border kb-border bg-surface" [innerHTML]="item.icon"></div>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-xs uppercase tracking-wide kb-muted">{{ item.category.name }}</p>
                    <span class="rounded-full border kb-border px-2 py-0.5 text-[11px] kb-muted">v{{ item.version }}</span>
                  </div>
                  <h3 class="mt-1 font-medium kb-text">{{ item.name }}</h3>
                  <p class="mt-2 text-sm leading-6 kb-muted">{{ item.description }}</p>
                </div>
              </div>
              <div class="mt-5 flex items-center justify-between border-t kb-border pt-4 text-xs kb-muted">
                <span>{{ imageLabel(item) }}</span>
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
