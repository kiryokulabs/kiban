import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconsComponent } from '../shared/icons.component';
import { SettingsApiService, type TraefikInfo } from '../settings/settings-api.service';

@Component({
  selector: 'kiban-settings-page',
  standalone: true,
  imports: [IconsComponent, FormsModule],
  template: `
    <div class="space-y-6 max-w-full">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="settings" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Settings</h1>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Instance Domain -->
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
              <kiban-icon name="server" [size]="16" />
            </div>
            <div>
              <p class="text-sm font-medium kb-text">Instance domain</p>
              <p class="text-xs c-muted">Access Kiban without port 8080</p>
            </div>
          </div>

          @if (loading()) {
            <p class="text-sm c-muted">Loading...</p>
          } @else {
            <div class="space-y-3">
              <input
                type="text"
                class="input"
                placeholder="kiban.example.com"
                [value]="domain()"
                (input)="onDomainInput($event)"
                [disabled]="saving()"
              />

              @if (domain()) {
                <div class="badge-warning rounded-lg bg-brand/5 border border-brand/10 p-3">
                  <p class="text-xs c-muted mb-1">DNS configuration required:</p>
                  <code class="text-xs kb-text">A&nbsp;&nbsp;&nbsp;{{ domain() }}&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;your server IP</code>
                </div>
              }

              @if (saved()) {
                <p class="text-xs text-green-500">Domain saved. Kiban is now accessible at {{ domain() }}.</p>
              }

              @if (error()) {
                <p class="text-xs text-red-500">{{ error() }}</p>
              }

              <div class="flex gap-2">
                <button
                  class="btn btn-primary"
                  (click)="save()"
                  [disabled]="saving() || !hasChanges()"
                >
                  {{ saving() ? 'Saving...' : 'Save domain' }}
                </button>

                @if (domain()) {
                  <button
                    class="btn btn-secondary"
                    (click)="clear()"
                    [disabled]="saving()"
                  >
                    Clear
                  </button>
                }
              </div>

              <p class="text-xs c-muted">
                Kiban remains accessible at IP:8080 until you close that port manually.
              </p>
            </div>
          }
        </div>

        <!-- Services Wildcard Domain -->
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
              <kiban-icon name="grid" [size]="16" />
            </div>
            <div>
              <p class="text-sm font-medium kb-text">Services wildcard domain</p>
              <p class="text-xs c-muted">Default domains for installed services</p>
            </div>
          </div>

          @if (wildcardLoading()) {
            <p class="text-sm c-muted">Loading...</p>
          } @else {
            <div class="space-y-3">
              <input
                type="text"
                class="input"
                placeholder="apps.example.com"
                [value]="wildcardDomain()"
                (input)="onWildcardDomainInput($event)"
                [disabled]="wildcardSaving()"
              />

              @if (wildcardDomain()) {
                <div class="badge-warning rounded-lg bg-brand/5 border border-brand/10 p-3">
                  <p class="text-xs c-muted mb-1">DNS configuration required:</p>
                  <code class="text-xs kb-text">A&nbsp;&nbsp;&nbsp;*.{{ wildcardDomain() }}&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;your server IP</code>
                  <p class="text-xs c-muted mt-2">Example: plausible.production.project.{{ wildcardDomain() }}</p>
                </div>
              }

              @if (wildcardSaved()) {
                <p class="text-xs text-green-500">Wildcard domain saved. New services will use {{ wildcardDomain() }}.</p>
              }

              @if (wildcardError()) {
                <p class="text-xs text-red-500">{{ wildcardError() }}</p>
              }

              <div class="flex gap-2">
                <button
                  class="btn btn-primary"
                  (click)="saveWildcardDomain()"
                  [disabled]="wildcardSaving() || !hasWildcardChanges()"
                >
                  {{ wildcardSaving() ? 'Saving...' : 'Save wildcard domain' }}
                </button>
              </div>

              <p class="text-xs c-muted">
                Affects newly installed services only. Existing service domains remain unchanged.
              </p>
            </div>
          }
        </div>
      </div>

      <!-- Reverse Proxy (Traefik) -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="box" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Reverse proxy</p>
            <p class="text-xs c-muted">Traefik routes traffic to Kiban and installed services</p>
          </div>
        </div>

        @if (traefikLoading()) {
          <p class="text-sm c-muted">Loading...</p>
        } @else if (traefikInfo(); as info) {
          <!-- Status badge -->
          <div class="flex items-center gap-2 mb-4">
            @switch (info.status) {
              @case ('running') {
                <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-success">Running</span>
              }
              @case ('stopped') {
                <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-danger">Stopped</span>
              }
              @case ('not-installed') {
                <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-danger">Not installed</span>
              }
            }
            @if (info.version) {
              <span class="text-xs c-muted">{{ info.version }}</span>
            }
          </div>

          @if (info.status !== 'not-installed') {
            <!-- Configuration -->
            <div class="space-y-3 mb-4">
              <div>
                <p class="text-xs c-muted mb-1">Ports</p>
                <div class="flex flex-wrap gap-2">
                  @for (port of info.ports; track port.published) {
                    <span class="badge">{{ port.published }}:{{ port.target }}</span>
                  }
                </div>
              </div>

              <div>
                <p class="text-xs c-muted mb-1">Entrypoints</p>
                <div class="flex flex-wrap gap-2">
                  @for (ep of info.entrypoints; track ep.name) {
                    <span class="badge">{{ ep.name }} ({{ ep.address }})</span>
                  }
                </div>
              </div>

              <div class="flex items-center gap-4">
                @if (info.dockerNetwork) {
                  <div>
                    <p class="text-xs c-muted mb-1">Docker network</p>
                    <code class="text-xs kb-text">{{ info.dockerNetwork }}</code>
                  </div>
                }
                <div>
                  <p class="text-xs c-muted mb-1">Dashboard</p>
                  <span class="text-xs kb-text">{{ info.dashboard ? 'Enabled' : 'Disabled' }}</span>
                </div>
              </div>
            </div>

            <!-- Active Routers -->
            <div>
              <p class="text-xs c-muted mb-2">Active routers ({{ info.routers.length }})</p>
              @if (info.routers.length === 0) {
                <p class="text-xs c-muted">No routers configured.</p>
              } @else {
                <div class="space-y-2">
                  @for (router of info.routers; track router.name) {
                    <div class="rounded-lg border border-white/5 p-3">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium kb-text">{{ router.name }}</span>
                        <span class="text-xs c-muted">{{ router.entrypoint }}</span>
                      </div>
                      <code class="text-xs kb-text block mb-1">{{ router.rule }}</code>
                      <div class="flex items-center gap-3 text-xs c-muted">
                        <span>port: {{ router.port }}</span>
                        <span>container: {{ router.container }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `
})
export class SettingsPageComponent implements OnInit {
  private readonly api: SettingsApiService;

  public readonly domain = signal('');
  public readonly loading = signal(true);
  public readonly saving = signal(false);
  public readonly saved = signal(false);
  public readonly error = signal('');
  private originalDomain = '';

  public readonly wildcardDomain = signal('');
  public readonly wildcardLoading = signal(true);
  public readonly wildcardSaving = signal(false);
  public readonly wildcardSaved = signal(false);
  public readonly wildcardError = signal('');
  private originalWildcardDomain = '';

  public readonly traefikInfo = signal<TraefikInfo | null>(null);
  public readonly traefikLoading = signal(true);

  public constructor(http: HttpClient) {
    this.api = new SettingsApiService(http);
  }

  public ngOnInit(): void {
    this.loadDomain();
    this.loadWildcardDomain();
    this.loadTraefikInfo();
  }

  public onDomainInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.domain.set(input.value);
    this.saved.set(false);
    this.error.set('');
  }

  public hasChanges(): boolean {
    return this.domain().trim() !== this.originalDomain;
  }

  public onWildcardDomainInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.wildcardDomain.set(input.value);
    this.wildcardSaved.set(false);
    this.wildcardError.set('');
  }

  public hasWildcardChanges(): boolean {
    return this.wildcardDomain().trim() !== this.originalWildcardDomain;
  }

  public async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      await this.api.setInstanceDomain(this.domain().trim()).toPromise();
      this.originalDomain = this.domain().trim();
      this.saved.set(true);
      this.loadTraefikInfo();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save domain.');
    } finally {
      this.saving.set(false);
    }
  }

  public async clear(): Promise<void> {
    this.domain.set('');
    await this.save();
  }

  public async saveWildcardDomain(): Promise<void> {
    this.wildcardSaving.set(true);
    this.wildcardError.set('');
    this.wildcardSaved.set(false);
    try {
      await this.api.setWildcardDomain(this.wildcardDomain().trim()).toPromise();
      this.originalWildcardDomain = this.wildcardDomain().trim();
      this.wildcardSaved.set(true);
    } catch (err: unknown) {
      this.wildcardError.set(err instanceof Error ? err.message : 'Failed to save wildcard domain.');
    } finally {
      this.wildcardSaving.set(false);
    }
  }

  private async loadDomain(): Promise<void> {
    try {
      const response = await this.api.getInstanceDomain().toPromise();
      const domain = response?.domain ?? '';
      this.domain.set(domain);
      this.originalDomain = domain;
    } catch {
      this.error.set('Failed to load current domain.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadWildcardDomain(): Promise<void> {
    try {
      const response = await this.api.getWildcardDomain().toPromise();
      const domain = response?.domain ?? '';
      this.wildcardDomain.set(domain);
      this.originalWildcardDomain = domain;
    } catch {
      this.wildcardError.set('Failed to load wildcard domain.');
    } finally {
      this.wildcardLoading.set(false);
    }
  }

  private async loadTraefikInfo(): Promise<void> {
    try {
      const info = await this.api.getTraefikInfo().toPromise();
      this.traefikInfo.set(info ?? null);
    } catch {
      this.traefikInfo.set(null);
    } finally {
      this.traefikLoading.set(false);
    }
  }
}
