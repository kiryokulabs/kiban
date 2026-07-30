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

type InstallStep = 1 | 2 | 3;
interface SchemaField { readonly key: string; readonly label: string; readonly required: boolean; readonly defaultValue: string; }

@Component({
  selector: 'kiban-project-details-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe, ConfirmModalComponent, ModalComponent],
  template: `
    <a routerLink="/projects" class="text-sm kb-muted">← Projects</a>
    @if (project()) {
      <div class="mt-6 flex items-start justify-between gap-6">
        <div><p class="mb-3 text-sm font-medium kb-muted">Project</p><h1 class="text-3xl font-semibold tracking-tight kb-text">{{ project()?.name }}</h1><p class="mt-3 kb-muted">{{ project()?.description || 'No description' }}</p></div>
        <button type="button" class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" (click)="openEnvironmentModal()">Add Environment</button>
      </div>
      @if (message()) { <p class="mt-5 rounded-lg border kb-border kb-panel px-3 py-2 text-sm kb-muted">{{ message() }}</p> }
      <div class="mt-8 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        @for (environment of project()?.environments; track environment.id) {
          <article class="flex min-h-[420px] flex-col rounded-xl border kb-border kb-panel p-5">
            <div class="flex items-start justify-between gap-4 border-b kb-border pb-4">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-medium kb-text">{{ environment.name }}</h2>
                  <span class="rounded-full border kb-border px-2 py-0.5 text-[11px] uppercase tracking-wide kb-muted">{{ environment.type }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 kb-muted">{{ environmentCardDescription(environment) }}</p>
              </div>
              <span class="rounded-full border kb-border px-2 py-1 text-xs kb-muted">{{ environment.status }}</span>
            </div>

            <div class="mt-5 flex flex-1 flex-col">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h3 class="font-medium kb-text">Services</h3>
                  <p class="mt-1 text-xs kb-muted">{{ installedFor(environment.id).length }} installed</p>
                </div>
                <button class="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950" type="button" (click)="openInstallDialog(environment)">Install</button>
              </div>

              @if (installedFor(environment.id).length === 0) {
                <div class="mt-5 flex flex-1 items-center justify-center rounded-lg border border-dashed kb-border p-6 text-center">
                  <div>
                    <p class="font-medium kb-text">No services installed</p>
                    <p class="mt-2 text-sm kb-muted">Install a catalog service in this isolated environment.</p>
                  </div>
                </div>
              } @else {
                <div class="mt-5 grid gap-3">
                  @for (service of installedFor(environment.id); track service.id) {
                    <div class="rounded-lg border kb-border bg-surface p-4">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="font-medium kb-text">{{ service.name }}</p>
                          <p class="mt-1 text-xs uppercase tracking-wide kb-muted">{{ service.status }} · {{ service.createdAt | slice:0:10 }}</p>
                        </div>
                        <button class="rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300" type="button" (click)="deleteInstalledService(service)">Delete</button>
                      </div>
                      <div class="mt-4 flex flex-wrap gap-2">
                        <button class="rounded-lg border kb-border px-3 py-2 text-xs kb-muted transition hover:kb-text" type="button" (click)="startInstalledService(service)">Start</button>
                        <button class="rounded-lg border kb-border px-3 py-2 text-xs kb-muted transition hover:kb-text" type="button" (click)="stopInstalledService(service)">Stop</button>
                        <button class="rounded-lg border kb-border px-3 py-2 text-xs kb-muted transition hover:kb-text" type="button" (click)="restartInstalledService(service)">Restart</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            @if (environment.type === 'custom') {
              <button type="button" class="mt-5 rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-300" (click)="requestDeleteEnvironment(environment)">Delete Environment</button>
            }
          </article>
        }
      </div>

      @if (installEnvironment()) {
        <kiban-modal title="Install Service" (close)="closeInstallDialog()">
          <div class="mb-5 flex gap-2 text-xs kb-muted"><span [class.kb-text]="installStep() === 1">1 Choose</span><span>→</span><span [class.kb-text]="installStep() === 2">2 Configure</span><span>→</span><span [class.kb-text]="installStep() === 3">3 Review</span></div>
          @if (installStep() === 1) {
            <input name="serviceSearch" [(ngModel)]="serviceSearch" placeholder="Search service..." class="w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none" />
            <div class="mt-4 flex flex-wrap gap-2"><button type="button" class="rounded-full border px-3 py-1 text-xs" [class.bg-zinc-100]="selectedCatalogCategory() === 'all'" [class.text-zinc-950]="selectedCatalogCategory() === 'all'" (click)="selectedCatalogCategory.set('all')">All</button>@for (category of catalogCategories(); track category.id) { <button type="button" class="rounded-full border kb-border px-3 py-1 text-xs kb-muted" [class.bg-zinc-100]="selectedCatalogCategory() === category.id" [class.text-zinc-950]="selectedCatalogCategory() === category.id" (click)="selectedCatalogCategory.set(category.id)">{{ category.name }}</button> }</div>
            <div class="mt-5 max-h-80 space-y-2 overflow-auto">@for (item of selectableServices(); track item.id) { <button type="button" class="w-full rounded-lg border kb-border p-3 text-left transition hover:border-zinc-500" (click)="selectService(item)"><span class="font-medium kb-text">{{ item.name }}</span><span class="mt-1 block text-sm kb-muted">{{ item.description }}</span></button> }</div>
          }
          @if (installStep() === 2 && selectedService()) {
            <form (ngSubmit)="goToReview()"><p class="mb-4 text-sm kb-muted">Configuration generated from schema.json.</p>@for (field of schemaFields(); track field.key) { <label class="mt-4 block text-sm"><span class="mb-2 block kb-muted">{{ field.label }} @if (field.required) { <span>*</span> }</span><input [name]="field.key" [(ngModel)]="configurationValues[field.key]" class="w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none" /></label> }<div class="mt-6 flex justify-end gap-3"><button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted" type="button" (click)="installStep.set(1)">Back</button><button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="submit">Review</button></div></form>
          }
          @if (installStep() === 3 && selectedService()) {
            <div class="space-y-4 text-sm"><div><p class="kb-muted">Name</p><p class="font-medium kb-text">{{ selectedService()?.name }}</p></div><div><p class="kb-muted">Image</p><p class="font-medium kb-text">{{ imageLabel(selectedService()!) }}</p></div><div><p class="kb-muted">Ports</p><p class="kb-text">{{ manifestList(selectedService()!, 'ports') }}</p></div><div><p class="kb-muted">Volumes</p><p class="kb-text">{{ manifestList(selectedService()!, 'volumes') }}</p></div><div><p class="kb-muted">Environment Variables</p><p class="kb-text">{{ configurationKeys().join(', ') || 'None' }}</p></div></div>
            <div class="mt-6 flex justify-end gap-3"><button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted" type="button" (click)="installStep.set(2)">Back</button><button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="button" (click)="installSelectedService()">Install</button></div>
          }
        </kiban-modal>
      }

      @if (environmentModalOpen()) { <kiban-modal title="Create Environment" (close)="closeEnvironmentModal()"><form (ngSubmit)="createEnvironment()"><p class="mb-5 text-sm leading-6 kb-muted">Create an isolated custom environment for this project.</p><label class="block text-sm"><span class="mb-2 block kb-muted">Environment Name</span><input name="environmentName" [(ngModel)]="environmentName" placeholder="QA, Demo, Preview..." class="w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none" required maxlength="100" /></label><label class="mt-4 block text-sm"><span class="mb-2 block kb-muted">Description</span><textarea name="environmentDescriptionText" [(ngModel)]="environmentDescriptionText" class="min-h-24 w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none"></textarea></label><div class="mt-6 flex justify-end gap-3"><button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted" type="button" (click)="closeEnvironmentModal()">Cancel</button><button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="submit" [disabled]="!environmentName.trim()">Create</button></div></form></kiban-modal> }
      @if (environmentPendingDelete()) { <kiban-confirm-modal title="Delete environment" [message]="deleteEnvironmentMessage()" confirmLabel="Delete environment" [destructive]="true" (cancel)="cancelDeleteEnvironment()" (confirm)="confirmDeleteEnvironment()" /> }
    } @else { <div class="mt-8 rounded-xl border kb-border kb-panel p-8 kb-muted">Loading project…</div> }
  `
})
export class ProjectDetailsPageComponent {
  private readonly route = inject(ActivatedRoute); private readonly projectsService = inject(ProjectsService); private readonly installedServices = inject(InstalledServicesService); private readonly catalogService = inject(CatalogService); private readonly environmentPresenter = new EnvironmentCardPresenter(); private readonly catalogPresenter = new CatalogPagePresenter();
  protected readonly project = signal<ProjectDetails | null>(null); protected readonly message = signal<string | null>(null); protected readonly environmentPendingDelete = signal<EnvironmentItem | null>(null); protected readonly environmentModalOpen = signal(false); protected readonly servicesByEnvironment = signal<Readonly<Record<string, readonly InstalledService[]>>>({}); protected readonly catalogCategories = signal<readonly CatalogCategory[]>([]); protected readonly catalogItems = signal<readonly CatalogItem[]>([]); protected readonly installEnvironment = signal<EnvironmentItem | null>(null); protected readonly selectedService = signal<CatalogItem | null>(null); protected readonly installStep = signal<InstallStep>(1); protected readonly selectedCatalogCategory = signal('all');
  protected environmentName = ''; protected environmentDescriptionText = ''; protected serviceSearch = ''; protected configurationValues: Record<string, string> = {}; private readonly projectId: string | null;
  public constructor() { this.projectId = this.route.snapshot.paramMap.get('id'); this.loadCatalog(); this.loadProject(); }
  protected loadProject(): void { if (this.projectId) this.projectsService.getProject(this.projectId).subscribe({ next: (project) => { this.project.set(project); for (const environment of project.environments) this.loadInstalledServices(environment.id); }, error: () => this.message.set('Could not load project.') }); }
  protected loadCatalog(): void { this.catalogService.list().subscribe({ next: (catalog) => { this.catalogCategories.set(catalog.categories); this.catalogItems.set(catalog.items); }, error: () => this.message.set('Could not load catalog.') }); }
  protected installedFor(environmentId: string): readonly InstalledService[] { return this.servicesByEnvironment()[environmentId] ?? []; }
  private loadInstalledServices(environmentId: string): void { if (!this.projectId) return; this.installedServices.list(this.projectId, environmentId).subscribe({ next: (services) => this.servicesByEnvironment.set({ ...this.servicesByEnvironment(), [environmentId]: services }), error: () => this.message.set('Could not load installed services.') }); }
  protected openInstallDialog(environment: EnvironmentItem): void { this.installEnvironment.set(environment); this.selectedService.set(null); this.installStep.set(1); this.configurationValues = {}; this.serviceSearch = ''; this.selectedCatalogCategory.set('all'); }
  protected closeInstallDialog(): void { this.installEnvironment.set(null); }
  protected selectableServices(): readonly CatalogItem[] { const searched = this.catalogItems().filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(this.serviceSearch.toLowerCase())); return this.catalogPresenter.visibleItems(searched, this.selectedCatalogCategory()); }
  protected selectService(item: CatalogItem): void { this.selectedService.set(item); this.configurationValues = Object.fromEntries(this.schemaFieldsFor(item).map((field) => [field.key, field.defaultValue])); this.installStep.set(2); }
  protected schemaFields(): readonly SchemaField[] { const item = this.selectedService(); return item ? this.schemaFieldsFor(item) : []; }
  private schemaFieldsFor(item: CatalogItem): readonly SchemaField[] { const properties = item.schema['properties']; const required = Array.isArray(item.schema['required']) ? item.schema['required'] : []; if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return []; return Object.entries(properties).map(([key, value]) => { const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {}; const title = typeof record['title'] === 'string' ? record['title'] : key; const defaultValue = typeof record['default'] === 'string' ? record['default'] : ''; return { key, label: title, required: required.includes(key), defaultValue }; }); }
  protected goToReview(): void { this.installStep.set(3); }
  protected installSelectedService(): void { const env = this.installEnvironment(); const service = this.selectedService(); if (!this.projectId || !env || !service) return; this.installedServices.install(this.projectId, env.id, { serviceId: service.id, configuration: this.configurationValues }).subscribe({ next: () => { this.closeInstallDialog(); this.loadInstalledServices(env.id); }, error: () => this.message.set('Could not install service. Check configuration and duplicates.') }); }
  protected startInstalledService(service: InstalledService): void { this.installedServices.start(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not start service.') }); }
  protected stopInstalledService(service: InstalledService): void { this.installedServices.stop(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not stop service.') }); }
  protected restartInstalledService(service: InstalledService): void { this.installedServices.restart(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not restart service.') }); }
  protected deleteInstalledService(service: InstalledService): void { this.installedServices.delete(service.id).subscribe({ next: () => this.loadInstalledServices(service.environmentId), error: () => this.message.set('Could not delete service.') }); }
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
