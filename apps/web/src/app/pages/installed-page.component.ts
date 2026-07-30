import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import type { InstalledService } from '../installed-services/installed-services.models';
import { InstalledServicesService } from '../installed-services/installed-services.service';

@Component({
  selector: 'kiban-installed-page',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight kb-text">Installed</h1>
        <p class="mt-3 kb-muted">Services installed across every environment.</p>
      </div>
      <button class="rounded-lg border kb-border px-3 py-2 text-sm kb-muted transition hover:kb-text" type="button" (click)="loadServices()">Refresh</button>
    </div>

    @if (message()) { <p class="mt-6 rounded-lg border kb-border kb-panel px-3 py-2 text-sm kb-muted">{{ message() }}</p> }

    @if (services().length === 0 && !loading()) {
      <div class="mt-8 rounded-xl border kb-border kb-panel p-10 text-center">
        <p class="font-medium kb-text">No services installed</p>
        <p class="mt-2 text-sm kb-muted">Install a catalog service inside a project environment.</p>
      </div>
    } @else {
      <div class="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        @for (service of services(); track service.id) {
          <article class="rounded-xl border kb-border kb-panel p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="font-medium kb-text">{{ service.name }}</h2>
                <p class="mt-1 text-xs uppercase tracking-wide kb-muted">{{ service.status }} · {{ service.createdAt | slice:0:10 }}</p>
              </div>
              <span class="h-2.5 w-2.5 rounded-full" [class.bg-emerald-500]="service.status === 'running'" [class.bg-red-500]="service.status === 'failed'" [class.bg-zinc-500]="service.status !== 'running' && service.status !== 'failed'"></span>
            </div>
            <div class="mt-5 space-y-2 text-sm kb-muted">
              <p>Service ID: <span class="kb-text">{{ service.serviceId }}</span></p>
              <p>Environment: <span class="kb-text">{{ service.environmentId }}</span></p>
              @if (containerId(service)) { <p>Container: <span class="kb-text">{{ containerId(service) }}</span></p> }
            </div>
          </article>
        }
      </div>
    }
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
