import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconsComponent } from '../shared/icons.component';
import { SettingsApiService } from '../settings/settings-api.service';

@Component({
  selector: 'kiban-settings-page',
  standalone: true,
  imports: [IconsComponent, FormsModule],
  template: `
    <div class="space-y-6 max-w-2xl">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="settings" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Settings</h1>
        </div>
      </div>

      <!--<div class="card p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
              <kiban-icon name="info" [size]="16" />
            </div>
            <div>
              <p class="text-sm font-medium kb-text">Application version</p>
              <p class="text-xs c-muted">Kiban Foundation</p>
            </div>
          </div>
          <span class="badge">0.1.0</span>
        </div>
      </div>
      -->

      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="server" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Instance domain</p>
            <p class="text-xs c-muted">Assign a domain to access Kiban without exposing port 8080</p>
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
              <div class="rounded-lg bg-brand/5 border border-brand/10 p-3">
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
          </div>
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

  public constructor(http: HttpClient) {
    this.api = new SettingsApiService(http);
  }

  public ngOnInit(): void {
    this.loadDomain();
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

  public async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      await this.api.setInstanceDomain(this.domain().trim()).toPromise();
      this.originalDomain = this.domain().trim();
      this.saved.set(true);
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
}
