import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ALL_CATALOG_CATEGORIES, CatalogPagePresenter, type CatalogCategorySelection, type CatalogInstallTarget } from '../catalog/catalog-page.presenter';
import type { CatalogCategory, CatalogItem } from '../catalog/catalog.models';
import { CatalogService } from '../catalog/catalog.service';
import { resolveSchemaDefaultValue } from '../catalog/schema-defaults';
import type { ProjectDetails } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { InstalledServicesService } from '../installed-services/installed-services.service';
import { ModalComponent } from '../shared/modal.component';
import { IconsComponent } from '../shared/icons.component';
import { SvgIconComponent } from '../shared/svg-icon.component';
import { CategorySliderComponent } from '../shared/category-slider.component';
import { CategorySliderPresenter, type CategorySliderItem } from '../shared/category-slider.presenter';

interface CatalogSchemaField { readonly key: string; readonly label: string; readonly required: boolean; readonly secret: boolean; }

@Component({
  selector: 'kiban-catalog-page',
  standalone: true,
  imports: [FormsModule, IconsComponent, ModalComponent, SvgIconComponent, CategorySliderComponent],
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

        <kiban-category-slider [items]="categorySliderItems()" [selectedId]="selectedCategoryId()" (selectionChange)="selectCategory($event)" />
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
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (item of visibleItems(); track item.id) {
            <article class="card min-w-0 overflow-hidden p-4 transition hover:border-brand/30 hover:bg-hover/30 group cursor-default">
              <div class="flex min-w-0 items-start gap-3">
                <div class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border kb-border bg-surface [&_svg]:h-6 [&_svg]:w-6 py-2">
                  <kiban-svg-icon [svg]="item.icon" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] uppercase tracking-wider c-subtle">{{ item.category.name }}</span>
                  </div>
                  <h3 class="mt-0.5 truncate text-sm font-medium kb-text">{{ item.name }}</h3>
                  <p class="mt-1 text-xs leading-relaxed c-muted line-clamp-2">{{ item.description }}</p>
                </div>
              </div>
              <div class="mt-3 flex min-w-0 items-center justify-between gap-3 border-t kb-border pt-3">
                <span class="min-w-0 flex-1 truncate font-mono text-[11px] c-subtle" title="{{ item.runtimeImage }}">{{ item.runtimeImage }}</span>
                <button class="btn-primary btn shrink-0 gap-1.5 text-xs px-2.5 py-1.5" type="button" (click)="openInstallModal(item)">
                  <kiban-icon name="plus" [size]="13" />
                  Install
                </button>
              </div>
            </article>
          }
        </div>
      }


      @if (serviceForInstall(); as service) {
        <kiban-modal title="Install {{ service.name }}" [wide]="true" (close)="closeInstallModal()">
          <div class="space-y-5">
            <div>
              <p class="text-sm kb-text">Choose exactly where this service should be installed.</p>
              <p class="mt-1 text-xs c-muted">You can select multiple projects and multiple environments.</p>
            </div>

            @if (projects().length === 0) {
              <div class="rounded-lg border kb-border p-4 text-sm c-muted">No projects available. Create a project first.</div>
            } @else {
              <div class="max-h-72 space-y-3 overflow-auto pr-1">
                @for (group of installTargetGroups(); track group.projectId) {
                  <section class="rounded-xl border kb-border p-3">
                    <h3 class="text-sm font-medium kb-text">{{ group.projectName }}</h3>
                    <div class="mt-2 grid gap-2 sm:grid-cols-3">
                      @for (target of group.targets; track target.id) {
                        <label class="flex cursor-pointer items-center gap-2 rounded-lg border kb-border px-3 py-2 text-xs hover:bg-hover/40">
                          <input type="checkbox" [checked]="selectedTargetIds().has(target.id)" (change)="toggleTarget(target.id)" />
                          <span class="kb-text">{{ target.environmentName }}</span>
                        </label>
                      }
                    </div>
                  </section>
                }
              </div>
            }

            @if (schemaFields().length > 0) {
              <div class="border-t kb-border pt-4">
                <h3 class="text-sm font-medium kb-text">Configuration</h3>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  @for (field of schemaFields(); track field.key) {
                    <label class="block">
                      <span class="text-xs c-muted">{{ field.label }} @if (field.required) { <span>*</span> }</span>
                      <input class="input mt-1" [type]="field.secret ? 'password' : 'text'" [ngModel]="configurationValues()[field.key]" (ngModelChange)="updateConfigurationValue(field.key, $event)" />
                    </label>
                  }
                </div>
              </div>
            }

            @if (installing()) {
              <div>
                <div class="h-1.5 overflow-hidden rounded-full bg-white/10"><div class="h-full w-1/2 rounded-full bg-brand-light animate-[kiban-progress_1.2s_ease-in-out_infinite]"></div></div>
                <p class="mt-2 text-xs c-muted">Installing in {{ selectedTargetIds().size }} target(s)…</p>
              </div>
            }

            <div class="flex justify-end gap-2 border-t kb-border pt-4">
              <button class="btn-ghost btn" type="button" (click)="closeInstallModal()" [disabled]="installing()">Cancel</button>
              <button class="btn-primary btn gap-1.5" type="button" (click)="installSelectedService()" [disabled]="installing() || selectedTargetIds().size === 0">
                <kiban-icon name="plus" [size]="13" />
                Install in {{ selectedTargetIds().size }} target(s)
              </button>
            </div>
          </div>
        </kiban-modal>
      }
    </section>
  `
})
export class CatalogPageComponent {
  private readonly catalog = inject(CatalogService);
  private readonly projectsService = inject(ProjectsService);
  private readonly installedServices = inject(InstalledServicesService);
  private readonly presenter = new CatalogPagePresenter();
  private readonly categorySlider = new CategorySliderPresenter();
  protected readonly allCategoryId = ALL_CATALOG_CATEGORIES;
  protected readonly categories = signal<readonly CatalogCategory[]>([]);
  protected readonly items = signal<readonly CatalogItem[]>([]);
  protected readonly selectedCategoryId = signal<CatalogCategorySelection>(ALL_CATALOG_CATEGORIES);
  protected readonly visibleItems = computed(() => this.presenter.visibleItemsForSearch(this.items(), this.selectedCategoryId(), this.query));
  protected readonly message = signal<string | null>(null);
  protected readonly projects = signal<readonly ProjectDetails[]>([]);
  protected readonly serviceForInstall = signal<CatalogItem | null>(null);
  protected readonly selectedTargetIds = signal<ReadonlySet<string>>(new Set());
  protected readonly installing = signal(false);
  protected readonly configurationValues = signal<Record<string, string>>({});
  protected query = '';

  public constructor() {
    this.loadCatalog();
    this.loadProjects();
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

  protected categorySliderItems(): readonly CategorySliderItem[] {
    return this.categorySlider.items(this.allCategoryId, this.categories(), (categoryId) => this.countForCategory(categoryId));
  }

  protected installTargetGroups(): ReturnType<CatalogPagePresenter['installTargetGroups']> {
    return this.presenter.installTargetGroups(this.projects());
  }

  protected openInstallModal(service: CatalogItem): void {
    this.serviceForInstall.set(service);
    this.selectedTargetIds.set(new Set());
    this.configurationValues.set(this.defaultConfigurationValues(service));
    if (this.projects().length === 0) this.loadProjects();
  }

  protected closeInstallModal(): void {
    if (this.installing()) return;
    this.serviceForInstall.set(null);
    this.selectedTargetIds.set(new Set());
  }

  protected toggleTarget(targetId: string): void {
    this.selectedTargetIds.set(this.presenter.toggleTarget(this.selectedTargetIds(), targetId));
  }

  protected schemaFields(): readonly CatalogSchemaField[] {
    const service = this.serviceForInstall();
    if (!service) return [];
    const properties = service.schema['properties'];
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
    const requiredSource = service.schema['required'];
    const required = new Set(Array.isArray(requiredSource) ? requiredSource.filter((item): item is string => typeof item === 'string') : []);
    return Object.entries(properties as Readonly<Record<string, unknown>>).map(([key, raw]) => {
      const property = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Readonly<Record<string, unknown>> : {};
      const title = property['title'];
      const lowerKey = key.toLowerCase();
      return { key, label: typeof title === 'string' && title ? title : key, required: required.has(key), secret: lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') };
    });
  }

  protected updateConfigurationValue(key: string, value: string): void {
    this.configurationValues.set({ ...this.configurationValues(), [key]: value });
  }

  protected installSelectedService(): void {
    const service = this.serviceForInstall();
    if (!service) return;
    const targets = this.presenter.selectedInstallTargets(this.projects(), this.selectedTargetIds());
    if (targets.length === 0) return;
    this.installing.set(true);
    forkJoin(targets.map((target: CatalogInstallTarget) => this.installedServices.install(target.projectId, target.environmentId, { serviceId: service.id, configuration: this.configurationValues() }))).subscribe({
      next: () => { this.installing.set(false); this.message.set(`${service.name} installed in ${targets.length} target(s).`); this.closeInstallModal(); },
      error: () => { this.installing.set(false); this.message.set(`Could not install ${service.name} in every selected target.`); }
    });
  }

  private loadProjects(): void {
    this.projectsService.listProjects().subscribe({
      next: (summaries) => {
        if (summaries.length === 0) { this.projects.set([]); return; }
        forkJoin(summaries.map((summary) => this.projectsService.getProject(summary.id))).subscribe({
          next: (projects) => this.projects.set(projects),
          error: () => this.message.set('Could not load projects for installation.')
        });
      },
      error: () => this.message.set('Could not load projects for installation.')
    });
  }

  private defaultConfigurationValues(service: CatalogItem): Record<string, string> {
    const properties = service.schema['properties'];
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
    return Object.fromEntries(Object.entries(properties as Readonly<Record<string, unknown>>).map(([key, raw]) => {
      const property = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Readonly<Record<string, unknown>> : {};
      const defaultValue = property['default'];
      return [key, resolveSchemaDefaultValue(defaultValue)];
    }));
  }

  protected selectedCategoryName(): string {
    if (this.selectedCategoryId() === ALL_CATALOG_CATEGORIES) {
      return 'All services';
    }
    return this.categories().find((category) => category.id === this.selectedCategoryId())?.name ?? 'Services';
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
