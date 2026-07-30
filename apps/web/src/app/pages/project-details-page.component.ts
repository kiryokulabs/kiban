import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogPagePresenter } from '../catalog/catalog-page.presenter';
import type { CatalogCategory, CatalogItem } from '../catalog/catalog.models';
import { CatalogService } from '../catalog/catalog.service';
import type { InstalledService } from '../installed-services/installed-services.models';
import { InstalledServicesService } from '../installed-services/installed-services.service';
import { EnvironmentCardPresenter } from '../projects/environment-card.presenter';
import type { EnvironmentItem, ProjectDetails } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { ModalComponent } from '../shared/modal.component';
import { IconsComponent } from '../shared/icons.component';

type InstallStep = 1 | 2 | 3;
interface SchemaField { readonly key: string; readonly label: string; readonly required: boolean; readonly defaultValue: string; }

@Component({
  selector: 'kiban-project-details-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe, ConfirmModalComponent, ModalComponent, IconsComponent],
  template: `
    <div class="space-y-6">
      <!-- Back & header -->
      <div class="flex items-center gap-3 text-sm">
        <a routerLink="/projects" class="btn-ghost btn gap-1.5">
          <kiban-icon name="arrow-left" [size]="14" />
          Projects
        </a>
      </div>

      @if (project()) {
        <!-- Project header -->
        <div class="card p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/20 text-brand-light">
                  <kiban-icon name="projects" [size]="16" />
                </div>
                <div>
                  <h1 class="text-xl font-semibold kb-text">{{ project()?.name }}</h1>
                  <p class="mt-0.5 text-sm c-muted">{{ project()?.description || 'No description' }}</p>
                </div>
              </div>
            </div>
            <button type="button" class="btn-primary btn gap-1.5" (click)="openEnvironmentModal()">
              <kiban-icon name="plus" [size]="14" />
              Environment
            </button>
          </div>
        </div>

        @if (message()) {
          <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
            <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
            <p class="text-sm c-muted">{{ message() }}</p>
          </div>
        }

        <!-- Environment grid -->
        <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @for (environment of project()?.environments; track environment.id) {
            <article class="card flex flex-col overflow-hidden">
              <!-- Environment header -->
              <div class="flex items-start justify-between gap-3 border-b kb-border px-4 py-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h2 class="text-sm font-medium kb-text truncate">{{ environment.name }}</h2>
                    <span class="badge shrink-0">{{ environment.type }}</span>
                  </div>
                  <p class="mt-1 text-xs c-muted leading-relaxed">{{ environmentCardDescription(environment) }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="status-dot status-dot-muted"></span>
                  <span class="text-xs c-subtle">{{ environment.status }}</span>
                </div>
              </div>

              <!-- Services -->
              <div class="flex-1 p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <div class="flex items-center gap-2">
                    <kiban-icon name="box" [size]="14" class="c-muted" />
                    <span class="text-xs font-medium c-muted">Services</span>
                    <span class="text-xs c-subtle">({{ installedFor(environment.id).length }})</span>
                  </div>
                  <button class="btn-secondary btn gap-1" type="button" (click)="openInstallDialog(environment)">
                    <kiban-icon name="plus" [size]="12" />
                    Install
                  </button>
                </div>

                @if (installedFor(environment.id).length === 0) {
                  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed kb-border py-8 text-center">
                    <kiban-icon name="box" [size]="20" class="c-subtle" />
                    <p class="mt-2 text-xs font-medium c-muted">No services</p>
                    <p class="mt-0.5 text-xs c-subtle">Install a catalog service.</p>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (service of installedFor(environment.id); track service.id) {
                      <div class="rounded-lg border kb-border p-3">
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <p class="text-sm font-medium kb-text truncate">{{ service.name }}</p>
                              <span class="badge text-[10px] px-1.5 py-0.5 leading-none" [class.badge-success]="service.status === 'running'" [class.badge-warning]="service.status === 'installing'" [class.badge-danger]="service.status === 'failed' || service.status === 'stopped' || service.status === 'removing'">
                                {{ service.status }}
                              </span>
                            </div>
                            @if (accessUrls(service).length > 0) {
                              <div class="mt-1.5 flex flex-wrap gap-1.5">
                                @for (url of accessUrls(service); track url) {
                                  <a class="inline-flex items-center gap-1 rounded-full border kb-border px-2 py-0.5 text-[11px] c-muted hover:c-text transition-colors" [href]="url" target="_blank">
                                    {{ url }}
                                    <kiban-icon name="external-link" [size]="10" />
                                  </a>
                                }
                              </div>
                            }
                            <p class="mt-1 text-[11px] c-subtle">{{ service.createdAt | slice:0:10 }}</p>
                          </div>
                          <button class="btn-danger btn gap-1 text-[11px] px-2 py-1" type="button" (click)="requestDeleteInstalledService(service)">
                            <kiban-icon name="trash" [size]="12" />
                          </button>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <button class="btn-ghost btn gap-1 text-[11px] px-2 py-1" type="button" (click)="startInstalledService(service)" [disabled]="service.status === 'running'">
                            <kiban-icon name="play" [size]="12" />
                            Start
                          </button>
                          <button class="btn-ghost btn gap-1 text-[11px] px-2 py-1" type="button" (click)="stopInstalledService(service)" [disabled]="service.status !== 'running'">
                            <kiban-icon name="stop" [size]="12" />
                            Stop
                          </button>
                          <button class="btn-ghost btn gap-1 text-[11px] px-2 py-1" type="button" (click)="restartInstalledService(service)">
                            <kiban-icon name="restart" [size]="12" />
                            Restart
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Environment actions -->
              @if (environment.type === 'custom') {
                <div class="border-t kb-border px-4 py-2.5">
                  <button type="button" class="btn-danger btn gap-1 text-xs w-full justify-center" (click)="requestDeleteEnvironment(environment)">
                    <kiban-icon name="trash" [size]="12" />
                    Delete environment
                  </button>
                </div>
              }
            </article>
          }
        </div>

        <!-- Install modal -->
        @if (installEnvironment()) {
          <kiban-modal title="Install Service" (close)="closeInstallDialog()">
            <div class="mb-5">
              <div class="flex items-center gap-2 text-xs c-muted">
                <span [class.c-text]="installStep() === 1" [class.c-muted]="installStep() !== 1" class="flex items-center gap-1.5 font-medium">
                  @if (installStep() > 1) { <kiban-icon name="check" [size]="12" class="text-success" /> } @else { <span class="grid h-5 w-5 place-items-center rounded-full bg-brand/20 text-[10px] font-medium text-brand-light">1</span> }
                  Choose
                </span>
                <span class="mx-1 c-subtle">—</span>
                <span [class.c-text]="installStep() === 2" [class.c-muted]="installStep() !== 2" class="flex items-center gap-1.5 font-medium">
                  @if (installStep() > 2) { <kiban-icon name="check" [size]="12" class="text-success" /> } @else { <span class="grid h-5 w-5 place-items-center rounded-full bg-brand/20 text-[10px] font-medium text-brand-light">2</span> }
                  Configure
                </span>
                <span class="mx-1 c-subtle">—</span>
                <span [class.c-text]="installStep() === 3" [class.c-muted]="installStep() !== 3" class="flex items-center gap-1.5 font-medium">
                  <span class="grid h-5 w-5 place-items-center rounded-full bg-brand/20 text-[10px] font-medium text-brand-light">3</span>
                  Review
                </span>
              </div>
            </div>

            @if (installingService()) {
              <div class="card-subtle mb-5 p-4">
                <div class="flex items-center justify-between gap-4 text-sm">
                  <span class="flex items-center gap-2 font-medium kb-text">
                    <kiban-icon name="box" [size]="14" class="text-brand-light" />
                    Installing service
                  </span>
                  <span class="text-xs c-muted">Please wait…</span>
                </div>
                <div class="mt-3 h-1.5 overflow-hidden rounded-full kb-border bg-panel">
                  <div class="h-full w-1/3 animate-[kiban-progress_1.1s_ease-in-out_infinite] rounded-full bg-brand"></div>
                </div>
                <p class="mt-3 text-xs leading-5 c-muted">Kiban is pulling the image, creating runtime resources and starting the service.</p>
              </div>
            }

            <!-- Step 1: Choose -->
            @if (installStep() === 1) {
              <div class="relative">
                <kiban-icon name="search" [size]="14" class="absolute left-3 top-1/2 -translate-y-1/2 c-subtle pointer-events-none" />
                <input name="serviceSearch" [(ngModel)]="serviceSearch" placeholder="Search service..." class="input pl-9" />
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button type="button" class="btn gap-1 text-xs px-2.5 py-1.5" [class.btn-primary]="selectedCatalogCategory() === 'all'" [class.btn-ghost]="selectedCatalogCategory() !== 'all'" (click)="selectedCatalogCategory.set('all')">
                  <kiban-icon name="grid" [size]="12" />
                  All
                </button>
                @for (category of catalogCategories(); track category.id) {
                  <button type="button" class="btn gap-1 text-xs px-2.5 py-1.5" [class.btn-primary]="selectedCatalogCategory() === category.id" [class.btn-ghost]="selectedCatalogCategory() !== category.id" (click)="selectedCatalogCategory.set(category.id)">
                    {{ category.name }}
                  </button>
                }
              </div>
              <div class="mt-3 max-h-72 space-y-1 overflow-auto">
                @for (item of selectableServices(); track item.id) {
                  <button type="button" class="flex w-full items-start gap-3 rounded-lg border kb-border p-3 text-left transition hover:border-brand/50 hover:bg-hover" (click)="selectService(item)">
                    <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border kb-border bg-surface" [innerHTML]="item.icon"></div>
                    <div class="min-w-0 flex-1">
                      <span class="text-sm font-medium kb-text">{{ item.name }}</span>
                      <span class="mt-0.5 block text-xs c-muted leading-relaxed line-clamp-2">{{ item.description }}</span>
                    </div>
                    <kiban-icon name="chevron-right" [size]="14" class="c-subtle shrink-0 mt-1" />
                  </button>
                }
              </div>
            }

            <!-- Step 2: Configure -->
            @if (installStep() === 2 && selectedService()) {
              <form (ngSubmit)="goToReview()">
                <p class="mb-4 text-xs c-muted">Configure the service parameters.</p>
                @for (field of schemaFields(); track field.key) {
                  <label class="mt-3 block text-xs">
                    <span class="mb-1.5 block c-muted">
                      {{ field.label }}
                      @if (field.required) { <span class="text-danger">*</span> }
                    </span>
                    <input [name]="field.key" [(ngModel)]="configurationValues[field.key]" class="input" />
                  </label>
                }
                <div class="mt-5 flex justify-end gap-2">
                  <button class="btn-ghost btn" type="button" (click)="installStep.set(1)">Back</button>
                  <button class="btn-primary btn" type="submit">Review</button>
                </div>
              </form>
            }

            <!-- Step 3: Review -->
            @if (installStep() === 3 && selectedService()) {
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between border-b kb-border pb-2">
                  <span class="text-xs c-muted">Name</span>
                  <span class="text-xs font-medium kb-text">{{ selectedService()?.name }}</span>
                </div>
                <div class="flex items-center justify-between border-b kb-border pb-2">
                  <span class="text-xs c-muted">Image</span>
                  <span class="text-xs font-medium kb-text">{{ imageLabel(selectedService()!) }}</span>
                </div>
                <div class="flex items-center justify-between border-b kb-border pb-2">
                  <span class="text-xs c-muted">Ports</span>
                  <span class="text-xs kb-text">{{ manifestList(selectedService()!, 'ports') }}</span>
                </div>
                <div class="flex items-center justify-between border-b kb-border pb-2">
                  <span class="text-xs c-muted">Volumes</span>
                  <span class="text-xs kb-text">{{ manifestList(selectedService()!, 'volumes') }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs c-muted">Env variables</span>
                  <span class="text-xs kb-text">{{ configurationKeys().join(', ') || 'None' }}</span>
                </div>
              </div>
              <div class="mt-5 flex justify-end gap-2">
                <button class="btn-ghost btn" type="button" [disabled]="installingService()" (click)="installStep.set(2)">Back</button>
                <button class="btn-primary btn gap-1" type="button" [disabled]="installingService()" (click)="installSelectedService()">
                  @if (installingService()) {
                    <span>Installing…</span>
                  } @else {
                    <kiban-icon name="plus" [size]="14" />
                    <span>Install</span>
                  }
                </button>
              </div>
            }
          </kiban-modal>
        }

        <!-- Environment modal -->
        @if (environmentModalOpen()) {
          <kiban-modal title="Create Environment" (close)="closeEnvironmentModal()">
            <form (ngSubmit)="createEnvironment()">
              <p class="mb-5 text-xs leading-6 c-muted">Create an isolated custom environment for this project.</p>
              <label class="block text-xs">
                <span class="mb-1.5 block c-muted">Environment Name</span>
                <input name="environmentName" [(ngModel)]="environmentName" placeholder="QA, Demo, Preview..." class="input" required maxlength="100" />
              </label>
              <label class="mt-3 block text-xs">
                <span class="mb-1.5 block c-muted">Description</span>
                <textarea name="environmentDescriptionText" [(ngModel)]="environmentDescriptionText" class="input min-h-[5rem]"></textarea>
              </label>
              <div class="mt-5 flex justify-end gap-2">
                <button class="btn-ghost btn" type="button" (click)="closeEnvironmentModal()">Cancel</button>
                <button class="btn-primary btn" type="submit" [disabled]="!environmentName.trim()">Create</button>
              </div>
            </form>
          </kiban-modal>
        }

        <!-- Delete confirmations -->
        @if (installedServicePendingDelete()) {
          <kiban-confirm-modal title="Delete service" [message]="deleteInstalledServiceMessage()" confirmLabel="Delete service" [destructive]="true" (cancel)="cancelDeleteInstalledService()" (confirm)="confirmDeleteInstalledService()" />
        }
        @if (environmentPendingDelete()) {
          <kiban-confirm-modal title="Delete environment" [message]="deleteEnvironmentMessage()" confirmLabel="Delete environment" [destructive]="true" (cancel)="cancelDeleteEnvironment()" (confirm)="confirmDeleteEnvironment()" />
        }
      } @else {
        <div class="card p-8 text-center">
          <p class="text-sm c-muted">Loading project…</p>
        </div>
      }
    </div>
  `
})
export class ProjectDetailsPageComponent {
  private readonly route = inject(ActivatedRoute); private readonly projectsService = inject(ProjectsService); private readonly installedServices = inject(InstalledServicesService); private readonly catalogService = inject(CatalogService); private readonly environmentPresenter = new EnvironmentCardPresenter(); private readonly catalogPresenter = new CatalogPagePresenter();
  protected readonly project = signal<ProjectDetails | null>(null); protected readonly message = signal<string | null>(null); protected readonly environmentPendingDelete = signal<EnvironmentItem | null>(null); protected readonly installedServicePendingDelete = signal<InstalledService | null>(null); protected readonly environmentModalOpen = signal(false); protected readonly servicesByEnvironment = signal<Readonly<Record<string, readonly InstalledService[]>>>({}); protected readonly catalogCategories = signal<readonly CatalogCategory[]>([]); protected readonly catalogItems = signal<readonly CatalogItem[]>([]); protected readonly installEnvironment = signal<EnvironmentItem | null>(null); protected readonly selectedService = signal<CatalogItem | null>(null); protected readonly installStep = signal<InstallStep>(1); protected readonly installingService = signal(false); protected readonly selectedCatalogCategory = signal('all');
  protected environmentName = ''; protected environmentDescriptionText = ''; protected serviceSearch = ''; protected configurationValues: Record<string, string> = {}; private readonly projectId: string | null;
  public constructor() { this.projectId = this.route.snapshot.paramMap.get('id'); this.loadCatalog(); this.loadProject(); }
  protected loadProject(): void { if (this.projectId) this.projectsService.getProject(this.projectId).subscribe({ next: (project) => { this.project.set(project); for (const environment of project.environments) this.loadInstalledServices(environment.id); }, error: () => this.message.set('Could not load project.') }); }
  protected loadCatalog(): void { this.catalogService.list().subscribe({ next: (catalog) => { this.catalogCategories.set(catalog.categories); this.catalogItems.set(catalog.items); }, error: () => this.message.set('Could not load catalog.') }); }
  protected installedFor(environmentId: string): readonly InstalledService[] { return this.servicesByEnvironment()[environmentId] ?? []; }
  private loadInstalledServices(environmentId: string): void { if (!this.projectId) return; this.installedServices.list(this.projectId, environmentId).subscribe({ next: (services) => this.servicesByEnvironment.set({ ...this.servicesByEnvironment(), [environmentId]: services }), error: () => this.message.set('Could not load installed services.') }); }
  protected openInstallDialog(environment: EnvironmentItem): void { this.installEnvironment.set(environment); this.selectedService.set(null); this.installStep.set(1); this.configurationValues = {}; this.serviceSearch = ''; this.selectedCatalogCategory.set('all'); }
  protected closeInstallDialog(): void { if (this.installingService()) return; this.installEnvironment.set(null); }
  protected selectableServices(): readonly CatalogItem[] { const searched = this.catalogItems().filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(this.serviceSearch.toLowerCase())); return this.catalogPresenter.visibleItems(searched, this.selectedCatalogCategory()); }
  protected selectService(item: CatalogItem): void { this.selectedService.set(item); this.configurationValues = Object.fromEntries(this.schemaFieldsFor(item).map((field) => [field.key, field.defaultValue])); this.installStep.set(2); }
  protected schemaFields(): readonly SchemaField[] { const item = this.selectedService(); return item ? this.schemaFieldsFor(item) : []; }
  private schemaFieldsFor(item: CatalogItem): readonly SchemaField[] { const properties = item.schema['properties']; const required = Array.isArray(item.schema['required']) ? item.schema['required'] : []; if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return []; return Object.entries(properties).map(([key, value]) => { const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {}; const title = typeof record['title'] === 'string' ? record['title'] : key; const defaultValue = typeof record['default'] === 'string' ? record['default'] : ''; return { key, label: title, required: required.includes(key), defaultValue }; }); }
  protected goToReview(): void { this.installStep.set(3); }
  protected installSelectedService(): void { const env = this.installEnvironment(); const service = this.selectedService(); if (!this.projectId || !env || !service || this.installingService()) return; this.installingService.set(true); this.message.set('Installing service. This can take a few minutes while Kiban pulls the image and creates runtime resources.'); this.installedServices.install(this.projectId, env.id, { serviceId: service.id, configuration: this.configurationValues }).subscribe({ next: () => { this.installingService.set(false); this.closeInstallDialog(); this.message.set(null); this.loadInstalledServices(env.id); }, error: () => { this.installingService.set(false); this.message.set('Could not install service. Check configuration and duplicates.'); } }); }
  protected startInstalledService(service: InstalledService): void { this.installedServices.start(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not start service.') }); }
  protected stopInstalledService(service: InstalledService): void { this.installedServices.stop(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not stop service.') }); }
  protected restartInstalledService(service: InstalledService): void { this.installedServices.restart(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not restart service.') }); }
  protected requestDeleteInstalledService(service: InstalledService): void { this.installedServicePendingDelete.set(service); }
  protected cancelDeleteInstalledService(): void { this.installedServicePendingDelete.set(null); }
  protected deleteInstalledServiceMessage(): string { const service = this.installedServicePendingDelete(); return service ? `Delete service "${service.name}"? This will stop and remove its running runtime resources.` : ''; }
  protected confirmDeleteInstalledService(): void { const service = this.installedServicePendingDelete(); if (!service) return; this.installedServices.delete(service.id).subscribe({ next: () => { this.installedServicePendingDelete.set(null); this.loadInstalledServices(service.environmentId); }, error: () => this.message.set('Could not delete service.') }); }
  protected accessUrls(service: InstalledService): readonly string[] { const assignedPorts = service.runtime?.['assignedPorts']; if (!Array.isArray(assignedPorts)) return []; return assignedPorts.flatMap((entry) => { if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []; const port = (entry as Readonly<Record<string, unknown>>)['hostPort']; return typeof port === 'string' && port ? [`http://localhost:${port}`] : []; }); }
  protected configurationKeys(): readonly string[] { return Object.keys(this.configurationValues).filter((key) => this.configurationValues[key]); }
  protected imageLabel(item: CatalogItem): string { const docker = item.metadata['docker']; if (!docker || typeof docker !== 'object' || Array.isArray(docker)) return item.id; const image = (docker as Readonly<Record<string, unknown>>)['image']; const tag = (docker as Readonly<Record<string, unknown>>)['tag']; return `${typeof image === 'string' ? image : item.id}${typeof tag === 'string' ? `:${tag}` : ''}`; }
  protected manifestList(item: CatalogItem, key: 'ports' | 'volumes'): string { const value = item.metadata[key]; return Array.isArray(value) && value.length > 0 ? `${value.length} defined` : 'None'; }
  protected openEnvironmentModal(): void { this.environmentName = ''; this.environmentDescriptionText = ''; this.environmentModalOpen.set(true); }
  protected closeEnvironmentModal(): void { this.environmentModalOpen.set(false); }
  protected environmentCardDescription(environment: EnvironmentItem): string { return this.environmentPresenter.description(environment); }
  protected createEnvironment(): void { if (!this.projectId) return; const name = this.environmentName.trim(); if (!name) { this.message.set('Environment name is required.'); return; } this.projectsService.createEnvironment(this.projectId, { name, description: this.environmentDescriptionText.trim() || null }).subscribe({ next: () => { this.environmentName = ''; this.environmentDescriptionText = ''; this.environmentModalOpen.set(false); this.message.set(null); this.loadProject(); }, error: () => this.message.set('Could not create environment. Check the name and try again.') }); }
  protected requestDeleteEnvironment(environment: EnvironmentItem): void { if (environment.type !== 'custom') return; this.environmentPendingDelete.set(environment); }
  protected cancelDeleteEnvironment(): void { this.environmentPendingDelete.set(null); }
  protected deleteEnvironmentMessage(): string { const environment = this.environmentPendingDelete(); return environment ? `Delete environment "${environment.name}"? This cannot be undone.` : ''; }
  protected confirmDeleteEnvironment(): void { const environment = this.environmentPendingDelete(); if (!this.projectId || !environment || environment.type !== 'custom') return; this.projectsService.deleteEnvironment(this.projectId, environment.id).subscribe({ next: () => { this.environmentPendingDelete.set(null); this.loadProject(); }, error: () => this.message.set('Could not delete environment.') }); }
}
