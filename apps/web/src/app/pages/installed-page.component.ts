import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import type { InstalledService } from '../installed-services/installed-services.models';
import { InstalledServicesService } from '../installed-services/installed-services.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-installed-page',
  standalone: true,
  imports: [SlicePipe, IconsComponent],
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
              <div class="mt-4 space-y-1.5 text-xs c-subtle">
                <div class="flex items-center justify-between">
                  <span>Service ID</span>
                  <span class="kb-text font-mono">{{ service.serviceId }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Environment</span>
                  <span class="kb-text">{{ service.environmentId }}</span>
                </div>
                @if (containerId(service)) {
                  <div class="flex items-center justify-between">
                    <span>Container</span>
                    <span class="kb-text font-mono text-[11px]">{{ containerId(service) }}</span>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `
})
export class InstalledPageComponent {
  private readonly installedServices = inject(InstalledServicesService);
  protected readonly services = signal<readonly InstalledService[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);

  public constructor() { this.loadServices(); }

  protected loadServices(): void {
    this.loading.set(true);
    this.installedServices.listAll().subscribe({ next: (services) => { this.services.set(services); this.loading.set(false); this.message.set(null); }, error: () => { this.loading.set(false); this.message.set('Could not load installed services.'); } });
  }

  protected containerId(service: InstalledService): string | null {
    const value = service.runtime?.['containerId'];
    return typeof value === 'string' ? value : null;
  }
}
