import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InstalledService } from '../installed-services/installed-services.models';
import { InstalledServicesService } from '../installed-services/installed-services.service';
import { ServiceDetailsPresenter } from '../service-details/service-details.presenter';
import { ModalComponent } from '../shared/modal.component';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-installed-page',
  standalone: true,
  imports: [SlicePipe, ModalComponent, IconsComponent, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
              <kiban-icon name="installed" [size]="15" />
            </div>
            <h1 class="text-xl font-semibold kb-text">Installed</h1>
          </div>
          <p class="mt-0.5 text-sm c-muted">Services installed across every environment.</p>
        </div>
        <button class="btn-secondary btn gap-1.5" type="button" (click)="loadServices()">
          <kiban-icon name="refresh" [size]="14" />
          Refresh
        </button>
      </div>

      @if (message()) {
        <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
          <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
          <p class="text-sm c-muted">{{ message() }}</p>
        </div>
      }

      @if (services().length === 0 && !loading()) {
        <div class="card flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand-light">
            <kiban-icon name="box" [size]="24" />
          </div>
          <p class="text-sm font-medium kb-text">No services installed</p>
          <p class="mt-1 text-xs c-muted">Install a catalog service inside a project environment.</p>
        </div>
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (service of services(); track service.id) {
            <article class="card p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <div class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand/10 text-brand-light">
                      <kiban-icon name="box" [size]="14" />
                    </div>
                    <div>
                      <h2 class="text-sm font-medium kb-text truncate">{{ service.name }}</h2>
                      <p class="text-[11px] uppercase tracking-wide c-muted">{{ service.createdAt | slice:0:10 }}</p>
                    </div>
                  </div>
                </div>
                <span class="badge text-[10px] px-1.5 py-0.5 leading-none" [class.badge-success]="service.status === 'running'" [class.badge-warning]="service.status === 'installing'" [class.badge-danger]="service.status === 'failed' || service.status === 'stopped' || service.status === 'removing'">
                  <span class="status-dot" [class.status-dot-success]="service.status === 'running'" [class.status-dot-danger]="service.status === 'failed' || service.status === 'stopped' || service.status === 'removing'" [class.status-dot-warning]="service.status === 'installing'" [class.status-dot-muted]="service.status !== 'running' && service.status !== 'failed' && service.status !== 'stopped' && service.status !== 'removing' && service.status !== 'installing'"></span>
                  {{ service.status }}
                </span>
              </div>

              <!-- Access links / Details -->
              @if (detailsPresenter.hasWebAccess(detailsPresenter.accessPointsFor(service))) {
                <div class="mt-3 flex items-center justify-between gap-3">
                  @if (firstWebUrl(service); as url) {
                    <a class="min-w-0 truncate rounded-full border kb-border px-2 py-0.5 font-mono text-[11px] c-muted hover:c-text transition-colors" [href]="url" target="_blank">
                      {{ url }}
                    </a>
                  }
                  <a class="btn-ghost btn shrink-0 gap-1 text-[11px] px-2 py-0.5" [routerLink]="['/services', service.id]">
                    <kiban-icon name="info" [size]="11" />
                    Manage
                  </a>
                </div>
              } @else {
                <div class="mt-3 flex justify-end">
                  <a class="btn-ghost btn shrink-0 gap-1 text-[11px] px-2 py-0.5" [routerLink]="['/services', service.id]">
                    <kiban-icon name="info" [size]="11" />
                    Manage
                  </a>
                </div>
              }

              <div class="mt-3 space-y-1.5 text-xs c-subtle">
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-1"><kiban-icon name="box" [size]="10" /> Service ID</span>
                  <span class="kb-text font-mono truncate">{{ service.serviceId }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-1"><kiban-icon name="folder" [size]="10" /> Location</span>
                  <span class="kb-text truncate">{{ locationLabel(service) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-1"><kiban-icon name="grid" [size]="10" /> Environment</span>
                  <span class="kb-text truncate">{{ service.environmentId }}</span>
                </div>
                @if (containerId(service)) {
                  <div class="flex items-center justify-between gap-3">
                    <span class="flex items-center gap-1"><kiban-icon name="server" [size]="10" /> Container</span>
                    <span class="kb-text font-mono text-[11px] truncate">{{ containerId(service) }}</span>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>

    <!-- Service details modal -->
    @if (serviceForDetails(); as service) {
      <kiban-modal title="{{ service.name }}" (close)="closeDetails()">
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Service info -->
          <div class="col-span-full space-y-1.5 pb-3 border-b kb-border mb-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="c-muted">Status</span>
              <span class="badge text-[10px] px-1.5 py-0.5 leading-none"
                [class.badge-success]="service.status === 'running'"
                [class.badge-warning]="service.status === 'installing'"
                [class.badge-danger]="service.status === 'failed' || service.status === 'stopped' || service.status === 'removing'">{{ service.status }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="c-muted">Runtime</span>
              <span class="kb-text">{{ detailsPresenter.serviceLabel(service.runtime) }}</span>
            </div>
          </div>

          <!-- Access points -->
          @for (ap of detailsPresenter.accessPointsFor(service); track ap.kind + '-' + ap.port; let i = $index) {
            <div class="col-span-full">
              <h3 class="text-xs font-medium c-muted mb-2">{{ ap.name }}</h3>
              <div class="grid gap-2 sm:grid-cols-2">
                <!-- Host -->
                <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                  <div class="min-w-0">
                    <span class="block text-[10px] c-subtle">Host</span>
                    <span class="block text-xs font-medium kb-text truncate">{{ ap.host }}</span>
                  </div>
                  <button type="button" class="btn-icon shrink-0" (click)="copyToClipboard(ap.host)" title="Copy host">
                    <kiban-icon name="copy" [size]="12" />
                  </button>
                </div>

                <!-- Port -->
                <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                  <div class="min-w-0">
                    <span class="block text-[10px] c-subtle">Port</span>
                    <span class="block text-xs font-medium kb-text truncate">{{ ap.hostPort ?? ap.port }}</span>
                  </div>
                  <button type="button" class="btn-icon shrink-0" (click)="copyToClipboard('' + (ap.hostPort ?? ap.port))" title="Copy port">
                    <kiban-icon name="copy" [size]="12" />
                  </button>
                </div>

                <!-- Username -->
                @if (ap.username) {
                  <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                    <div class="min-w-0">
                      <span class="block text-[10px] c-subtle">Username</span>
                      <span class="block text-xs font-medium kb-text truncate">{{ ap.username }}</span>
                    </div>
                    <button type="button" class="btn-icon shrink-0" (click)="copyToClipboard(ap.username!)" title="Copy username">
                      <kiban-icon name="copy" [size]="12" />
                    </button>
                  </div>
                }

                <!-- Password -->
                @if (ap.password) {
                  <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                    <div class="min-w-0">
                      <span class="block text-[10px] c-subtle">Password</span>
                      <span class="block text-xs font-medium kb-text truncate font-mono">{{ visiblePasswords().has(i) ? ap.password : '••••••••' }}</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button type="button" class="btn-icon" (click)="togglePassword(i)" [title]="visiblePasswords().has(i) ? 'Hide password' : 'Show password'">
                        <kiban-icon [name]="visiblePasswords().has(i) ? 'eye-off' : 'eye'" [size]="12" />
                      </button>
                      <button type="button" class="btn-icon" (click)="copyToClipboard(ap.password!)" title="Copy password">
                        <kiban-icon name="copy" [size]="12" />
                      </button>
                    </div>
                  </div>
                }

                <!-- Database -->
                @if (ap.database) {
                  <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                    <div class="min-w-0">
                      <span class="block text-[10px] c-subtle">Database</span>
                      <span class="block text-xs font-medium kb-text truncate">{{ ap.database }}</span>
                    </div>
                    <button type="button" class="btn-icon shrink-0" (click)="copyToClipboard(ap.database!)" title="Copy database">
                      <kiban-icon name="copy" [size]="12" />
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Connection string -->
            @if (ap.connectionString) {
              <div class="col-span-full mt-1">
                <div class="flex items-center justify-between gap-2 rounded-lg border kb-border px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <span class="block text-[10px] c-subtle">Connection String</span>
                    <span class="block text-xs font-medium kb-text truncate font-mono">{{ visiblePasswords().has(i) ? ap.connectionString : detailsPresenter.obfuscatedConnectionString(ap) }}</span>
                  </div>
                  <button type="button" class="btn-icon shrink-0" (click)="copyToClipboard(ap.connectionString!)" title="Copy connection string">
                    <kiban-icon name="copy" [size]="12" />
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </kiban-modal>
    }
  `
})
export class InstalledPageComponent {
  private readonly installedServices = inject(InstalledServicesService);
  protected readonly detailsPresenter = new ServiceDetailsPresenter();
  protected readonly services = signal<readonly InstalledService[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly serviceForDetails = signal<InstalledService | null>(null);
  protected readonly visiblePasswords = signal<ReadonlySet<number>>(new Set());

  public constructor() { this.loadServices(); }

  protected loadServices(): void {
    this.loading.set(true);
    this.installedServices.listAll().subscribe({ next: (services) => { this.services.set(services); this.loading.set(false); this.message.set(null); }, error: () => { this.loading.set(false); this.message.set('Could not load installed services.'); } });
  }

  protected containerId(service: InstalledService): string | null {
    const value = service.runtime?.['containerId'];
    return typeof value === 'string' ? value : null;
  }

  protected firstWebUrl(service: InstalledService): string | null {
    return this.detailsPresenter.webUrls(this.detailsPresenter.accessPointsFor(service))[0] ?? null;
  }

  protected locationLabel(service: InstalledService): string {
    return service.location ? `${service.location.project.name} / ${service.location.environment.name}` : service.environmentId;
  }

  protected openDetails(service: InstalledService): void { this.serviceForDetails.set(service); this.visiblePasswords.set(new Set()); }
  protected closeDetails(): void { this.serviceForDetails.set(null); }
  protected copyToClipboard(value: string): void { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {}); }
  protected togglePassword(index: number): void { const current = this.visiblePasswords(); const next = new Set(current); if (next.has(index)) { next.delete(index); } else { next.add(index); } this.visiblePasswords.set(next); }
}
