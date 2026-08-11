import { SlicePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import type { InstalledServiceDetails, AccessPoint } from '../installed-services/installed-services.models';
import { InstalledServicesService } from '../installed-services/installed-services.service';
import { ServiceDetailsPresenter } from '../service-details/service-details.presenter';
import { TerminalComponent } from '../terminal/terminal.component';
import type { ConnectionState } from '../terminal/terminal.presenter';
import { TerminalService } from '../terminal/terminal.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { IconsComponent } from '../shared/icons.component';
import { SvgIconComponent } from '../shared/svg-icon.component';

@Component({
  selector: 'kiban-installed-service-details-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe, IconsComponent, ConfirmModalComponent, TerminalComponent, SvgIconComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a routerLink="/installed" class="inline-flex items-center gap-1 text-xs c-muted hover:c-text transition-colors"><kiban-icon name="arrow-left" [size]="13" /> Installed services</a>
          <div class="mt-3 flex items-center gap-3">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border kb-border bg-surface p-2">
              @if (details()?.overview?.icon; as icon) {
                <kiban-svg-icon [svg]="icon" />
              } @else {
                <kiban-icon name="box" [size]="20" class="c-muted" />
              }
            </div>
            <div>
              <h1 class="text-xl font-semibold kb-text">{{ details()?.overview?.name ?? 'Service' }}</h1>
              <p class="text-sm c-muted">{{ details()?.overview?.description ?? 'Manage access, configuration, runtime actions and logs.' }}</p>
            </div>
          </div>
        </div>
        <button class="btn-secondary btn gap-1.5" type="button" (click)="load()"><kiban-icon name="refresh" [size]="14" /> Refresh</button>
      </div>

      @if (message()) { <div class="card-subtle px-4 py-3 text-sm c-muted">{{ message() }}</div> }

      @if (details(); as d) {
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div class="card p-4 xl:col-span-2">
            <p class="flex items-center gap-1.5 text-xs c-muted"><kiban-icon name="folder" [size]="12" /> Location</p>
            <p class="mt-1 text-sm font-medium kb-text">{{ presenter.locationLabel(d) }}</p>
            <p class="mt-1 text-xs c-muted">Project: {{ d.location.project.name }} · Environment: {{ d.location.environment.name }}</p>
          </div>
          <div class="card p-4"><p class="flex items-center gap-1.5 text-xs c-muted"><kiban-icon name="info" [size]="12" /> Status</p><p class="mt-1"><span class="badge" [class.badge-success]="d.overview.status === 'running'" [class.badge-danger]="d.overview.status === 'stopped'" [class.badge-warning]="d.overview.status !== 'running' && d.overview.status !== 'stopped'">{{ d.overview.status }}</span></p></div>
          <div class="card p-4"><p class="flex items-center gap-1.5 text-xs c-muted"><kiban-icon name="check" [size]="12" /> Health</p><p class="mt-1"><span class="badge" [class.badge-success]="d.overview.health === 'healthy'" [class.badge-danger]="d.overview.health === 'unhealthy'" [class.badge-warning]="d.overview.health !== 'healthy' && d.overview.health !== 'unhealthy'">{{ d.overview.health }}</span></p></div>
          <div class="card p-4"><p class="flex items-center gap-1.5 text-xs c-muted"><kiban-icon name="box" [size]="12" /> Installed</p><p class="mt-1 text-sm font-medium kb-text">{{ d.overview.installedAt | slice:0:10 }}</p></div>
        </section>

        @if (presenter.errors(d).length > 0) {
          <section class="card p-4 border-danger/40">
            <h2 class="text-sm font-semibold kb-text flex items-center gap-2"><kiban-icon name="warning" [size]="15" /> Runtime errors</h2>
            @for (error of presenter.errors(d); track error.state + error.lastError) {
              <div class="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                <div><span class="block text-xs c-muted">State</span><span class="kb-text">{{ error.state }}</span></div>
                <div><span class="block text-xs c-muted">Exit code</span><span class="kb-text">{{ error.exitCode ?? '—' }}</span></div>
                <div><span class="block text-xs c-muted">Last error</span><span class="kb-text">{{ error.lastError }}</span></div>
              </div>
            }
          </section>
        }

        <section class="grid gap-4 xl:grid-cols-2">
          <div class="card p-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="check" [size]="14" /> Health details</h2>
            <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><span class="block text-xs c-muted">Status</span><span class="badge mt-1" [class.badge-success]="presenter.healthDetails(d).status === 'healthy'" [class.badge-danger]="presenter.healthDetails(d).status === 'unhealthy'" [class.badge-warning]="presenter.healthDetails(d).status !== 'healthy' && presenter.healthDetails(d).status !== 'unhealthy'">{{ presenter.healthDetails(d).status }}</span></div>
              <div><span class="block text-xs c-muted">Source</span><span class="mt-1 block kb-text">{{ presenter.healthDetails(d).source }}</span></div>
              <div><span class="block text-xs c-muted">Last checked</span><span class="mt-1 block kb-text">{{ readableDate(presenter.healthDetails(d).checkedAt) || 'Not checked yet' }}</span></div>
              <div><span class="block text-xs c-muted">Message</span><span class="mt-1 block kb-text">{{ presenter.healthDetails(d).message }}</span></div>
            </div>
          </div>
          <div class="card p-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="logs" [size]="14" /> Activity</h2>
            <div class="mt-3 space-y-2">
              @for (item of presenter.activity(d); track item.label + item.value) {
                <div class="flex items-center justify-between gap-3 rounded-lg border kb-border px-3 py-2 text-sm">
                  <span class="c-muted">{{ item.label }}</span>
                  <span class="kb-text">{{ readableDate(item.value) || item.value }}</span>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="card p-4">
          <div class="flex items-center justify-between gap-3"><h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="external-link" [size]="14" /> Access</h2></div>
          @if (d.accessPoints.length === 0) {
            <p class="mt-3 text-sm c-muted">No access information available yet.</p>
          } @else {
            <div class="mt-3 space-y-4">
              @if (presenter.webAccessPoints(d.accessPoints).length > 0) {
                <div>
                  <h3 class="text-xs font-medium c-muted">Web access</h3>
                  <div class="mt-2 grid gap-2 lg:grid-cols-2">
                    @for (ap of presenter.webAccessPoints(d.accessPoints); track ap.name + ap.port) {
                      <div class="flex items-center justify-between gap-3 rounded-lg border kb-border px-3 py-2">
                        <a class="min-w-0 truncate font-mono text-xs kb-text hover:c-text" [href]="webUrl(ap)" target="_blank">{{ webUrl(ap) }}</a>
                        <div class="flex shrink-0 gap-1">
                          <button class="btn-icon" type="button" (click)="copy(webUrl(ap))" title="Copy URL"><kiban-icon name="copy" [size]="12" /></button>
                          <a class="btn-icon" [href]="webUrl(ap)" target="_blank" title="Open"><kiban-icon name="external-link" [size]="12" /></a>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (presenter.databaseAccessPoints(d.accessPoints).length > 0) {
                <div>
                  <h3 class="text-xs font-medium c-muted">Credentials</h3>
                  <div class="mt-2 grid gap-3 lg:grid-cols-2">
                    @for (ap of presenter.databaseAccessPoints(d.accessPoints); track ap.name + ap.kind + ap.port; let i = $index) {
                      <article class="rounded-xl border kb-border p-3">
                        <h4 class="text-sm font-medium kb-text">{{ ap.name }}</h4>
                        <div class="mt-3 space-y-2">
                          @for (field of presenter.credentialFieldsFor(ap); track field.label) {
                            <div class="flex items-center justify-between gap-3 rounded-lg border kb-border px-3 py-2">
                              <div class="min-w-0"><span class="block text-[10px] c-muted">{{ field.label }}</span><span class="block truncate text-xs font-mono kb-text">{{ field.secret ? presenter.displaySecret(field.value, visibleSecrets().has(i + ':' + field.label)) : field.value }}</span></div>
                              <div class="flex gap-1">
                                @if (field.secret) { <button class="btn-icon" type="button" (click)="toggleSecret(i + ':' + field.label)"><kiban-icon [name]="visibleSecrets().has(i + ':' + field.label) ? 'eye-off' : 'eye'" [size]="12" /></button> }
                                <button class="btn-icon" type="button" (click)="copy(field.value)"><kiban-icon name="copy" [size]="12" /></button>
                              </div>
                            </div>
                          }
                        </div>
                        @if (presenter.connectionStringFieldFor(ap); as connectionString) {
                          <div class="mt-3">
                            <h5 class="text-xs font-medium c-muted">Connection string</h5>
                            <div class="mt-2 flex items-center justify-between gap-3 rounded-lg border kb-border px-3 py-2">
                              <div class="min-w-0"><span class="block truncate text-xs font-mono kb-text">{{ connectionString.secret ? presenter.displaySecret(connectionString.value, visibleSecrets().has(i + ':Connection String')) : connectionString.value }}</span></div>
                              <div class="flex gap-1">
                                @if (connectionString.secret) { <button class="btn-icon" type="button" (click)="toggleSecret(i + ':Connection String')"><kiban-icon [name]="visibleSecrets().has(i + ':Connection String') ? 'eye-off' : 'eye'" [size]="12" /></button> }
                                <button class="btn-icon" type="button" (click)="copy(connectionString.value)"><kiban-icon name="copy" [size]="12" /></button>
                              </div>
                            </div>
                          </div>
                        }
                      </article>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <section class="card p-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="play" [size]="14" /> Actions</h2>
          @if (actionInProgress()) { <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div class="h-full w-1/2 rounded-full bg-brand-light animate-[kiban-progress_1.2s_ease-in-out_infinite]"></div></div><p class="mt-2 text-xs c-muted">{{ actionInProgress() }}</p> }
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn-secondary btn gap-1.5" type="button" [disabled]="!!actionInProgress()" (click)="runAction('start')"><kiban-icon name="play" [size]="14" /> Start</button>
            <button class="btn-secondary btn gap-1.5" type="button" [disabled]="!!actionInProgress()" (click)="runAction('stop')"><kiban-icon name="stop" [size]="14" /> Stop</button>
            <button class="btn-secondary btn gap-1.5" type="button" [disabled]="!!actionInProgress()" (click)="runAction('restart')"><kiban-icon name="restart" [size]="14" /> Restart</button>
          </div>
        </section>

        <section class="card p-4">
          <div class="flex items-center justify-between gap-3">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="settings" [size]="14" /> Configuration</h2>
            @if (presenter.schemaFields(d).length > 0) {
              <button class="btn-primary btn text-xs" type="button" [disabled]="actionInProgress()" (click)="confirmSaveConfiguration.set(true)"> Save & recreate</button>
            }
          </div>
          @if (presenter.schemaFields(d).length === 0) {
            <div class="mt-3 rounded-lg border border-dashed kb-border p-4 text-sm c-muted">
              No configuration options available for this service.
            </div>
          } @else {
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              @for (field of presenter.schemaFields(d); track field.key) {
                <label class="block">
                  <span class="text-xs c-muted">{{ field.label }} @if (field.required) { <span>*</span> }</span>
                  <div class="relative mt-1">
                    <input class="input pr-10" [type]="configurationInputType(field)" [ngModel]="configurationValues()[field.key]" (ngModelChange)="updateConfigurationValue(field.key, $event)" />
                    @if (field.secret) {
                      <button class="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md c-muted transition-colors hover:c-text" type="button" (click)="toggleConfigurationSecret(field.key)" [attr.aria-label]="configurationSecretVisible(field.key) ? 'Hide value' : 'Show value'">
                        <kiban-icon [name]="configurationSecretVisible(field.key) ? 'eye-off' : 'eye'" [size]="12" />
                      </button>
                    }
                  </div>
                </label>
              }
            </div>
          }
        </section>
        <section class="grid gap-4 xl:grid-cols-2">
          <div class="card p-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="server" [size]="14" /> Runtime units</h2>
            <div class="mt-3 space-y-2">
              @for (c of presenter.containers(d); track c.id) {
                <div class="rounded-lg border kb-border p-3 text-sm">
                  <div class="flex justify-between gap-3">
                    <span class="font-medium kb-text">{{ c.name }}</span>
                    <div class="flex items-center gap-2">
                      <span class="status-dot" [class.status-dot-success]="c.status === 'running'" [class.status-dot-danger]="c.status === 'stopped'" [class.status-dot-warning]="c.status !== 'running' && c.status !== 'stopped'" [class.status-dot-muted]="c.status !== 'running' && c.status !== 'stopped'"></span>
                      <span class="badge badge-sm" [class.badge-success]="c.status === 'running'" [class.badge-danger]="c.status === 'stopped'" [class.badge-warning]="c.status !== 'running' && c.status !== 'stopped'">{{ c.status }}</span>
                      <span class="badge badge-sm" [class.badge-success]="c.health === 'healthy'" [class.badge-danger]="c.health === 'unhealthy'" [class.badge-warning]="c.health !== 'healthy' && c.health !== 'unhealthy'">{{ c.health }}</span>
                    </div>
                  </div>
                  <p class="mt-1 font-mono text-xs c-muted">{{ c.image }}</p>
                  <p class="mt-1 text-xs c-muted">Restart count: {{ c.restartCount }}</p>
                </div>
              }
            </div>
          </div>
          <div class="card p-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="folder" [size]="14" /> Persistent data</h2>
            @if (presenter.volumes(d).length === 0) {
              <div class="mt-3 rounded-lg border border-dashed kb-border p-4 text-sm c-muted">
                No persistent data configured for this service.
              </div>
            } @else {
              <div class="mt-3 space-y-2">
                @for (v of presenter.volumes(d); track v.name) {
                  <div class="flex justify-between gap-3 rounded-lg border kb-border p-3 text-sm"><span class="kb-text">{{ v.name }}</span><span class="c-muted">{{ v.mountPath }}</span></div>
                }
              </div>
            }
          </div>
          <div class="xl:col-span-2 grid gap-4 xl:grid-cols-2">
            <!-- Terminal -->
            <div class="card p-0 overflow-hidden flex flex-col min-h-80 max-h-96">
              <div class="flex items-center gap-2 px-4 py-2 border-b kb-border">
                <kiban-icon name="box" [size]="14" />
                <h2 class="text-sm font-semibold kb-text">Terminal</h2>
              </div>
              <kiban-terminal
                class="flex-1 flex flex-col"
                [containers]="presenter.containers(d)"
                [state]="terminalConnectionState()"
                [output]="terminalOutput()"
                [errorMessage]="terminalErrorMessage()"
                (containerChange)="onTerminalContainerChange($event)"
                (input)="onTerminalInput($event)"
                (resize)="onTerminalResize($event)"
                (disconnect)="onTerminalDisconnect()"
              />
            </div>

            <!-- Logs -->
            <div class="card p-4 flex flex-col min-h-80 max-h-96">
              <div class="flex items-center justify-between gap-2">
                <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="logs" [size]="14" /> Logs</h2>
                <div class="flex items-center gap-1">
                  <select class="input h-8 w-36 py-1 text-xs" [ngModel]="selectedLogContainer()" (ngModelChange)="selectedLogContainer.set($event)">
                    @for (option of presenter.logContainerOptions(d); track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                  <button class="btn-icon shrink-0" type="button" (click)="toggleAutoRefresh()"><kiban-icon [name]="autoRefresh() ? 'stop' : 'play'" [size]="12" /></button>
                  <button class="btn-icon shrink-0" type="button" (click)="clearLogs()"><kiban-icon name="x" [size]="12" /></button>
                  <button class="btn-icon shrink-0" type="button" (click)="copy(displayedLogs(d))"><kiban-icon name="copy" [size]="12" /></button>
                </div>
              </div>
              <pre class="mt-3 flex-1 overflow-auto rounded-lg border kb-border p-3 text-xs c-muted">{{ displayedLogs(d) || 'No logs yet.' }}</pre>
            </div>
          </div>
        </section>

        <section class="card border-danger/30 p-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="warning" [size]="14" /> Danger Zone</h2>
          <div class="mt-3 space-y-3">
            <div class="flex items-center justify-between gap-3 rounded-lg border border-danger/30 p-3">
              <div>
                <p class="text-sm font-medium kb-text">Recreate this service</p>
                <p class="mt-1 text-xs c-muted">This rebuilds the runtime units and may delete any data stored inside containers but not persisted in volumes.</p>
              </div>
              <button class="btn-danger btn gap-1.5" type="button" [disabled]="!!actionInProgress()" (click)="confirmRecreate.set(true)"><kiban-icon name="refresh" [size]="14" /> Recreate</button>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-lg border border-danger/30 p-3">
            <div>
              <p class="text-sm font-medium kb-text">Delete this service</p>
              <p class="mt-1 text-xs c-muted">This removes the service from Kiban and deletes its runtime resources.</p>
            </div>
            <button class="btn-danger btn gap-1.5" type="button" [disabled]="!!actionInProgress()" (click)="confirmDelete.set(true)"><kiban-icon name="trash" [size]="14" /> Delete</button>
            </div>
          </div>
        </section>

      }
    </div>

    @if (confirmDelete()) {
      <kiban-confirm-modal title="Delete service" message="This will remove the service from Kiban and delete its runtime resources." confirmLabel="Delete service" [destructive]="true" (cancel)="confirmDelete.set(false)" (confirm)="deleteService()" />
    }
    @if (confirmRecreate()) {
      <kiban-confirm-modal title="Recreate service" message="This will recreate the service runtime units. Any data stored inside containers and not persisted in volumes may be lost. Are you sure you want to continue?" confirmLabel="Recreate service" [destructive]="true" (cancel)="confirmRecreate.set(false)" (confirm)="recreateService()" />
    }
    @if (confirmSaveConfiguration()) {
      <kiban-confirm-modal title="Save configuration and recreate service" message="Saving this configuration will recreate the service runtime units. Any data stored inside containers and not persisted in volumes may be lost. Are you sure you want to continue?" confirmLabel="Save and recreate" [destructive]="true" (cancel)="confirmSaveConfiguration.set(false)" (confirm)="saveConfiguration()" />
    }
  `
})
export class InstalledServiceDetailsPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly installedServices = inject(InstalledServicesService);
  private readonly terminal = inject(TerminalService);
  protected readonly presenter = new ServiceDetailsPresenter();
  protected readonly details = signal<InstalledServiceDetails | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly actionInProgress = signal<string | null>(null);
  protected readonly confirmDelete = signal(false);
  protected readonly confirmRecreate = signal(false);
  protected readonly confirmSaveConfiguration = signal(false);
  protected readonly visibleSecrets = signal<ReadonlySet<string>>(new Set());
  protected readonly configurationValues = signal<Record<string, string>>({});
  protected readonly logs = signal('');
  protected readonly selectedLogContainer = signal('All containers');
  protected readonly autoRefresh = signal(false);
  protected readonly terminalConnectionState = signal<ConnectionState>('disconnected');
  protected readonly terminalOutput = signal<{ readonly data: string; readonly sequence: number } | null>(null);
  protected readonly terminalErrorMessage = signal<string | null>(null);
  protected readonly terminalContainerId = signal<string | null>(null);
  private terminalOutputSequence = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly terminalSubscriptions = new Subscription();
  private readonly serviceId: string;

  public constructor() {
    this.serviceId = this.route.snapshot.paramMap.get('id') ?? '';
    this.terminalSubscriptions.add(this.terminal.state$.subscribe((state) => this.terminalConnectionState.set(state)));
    this.terminalSubscriptions.add(this.terminal.errorMessage$.subscribe((message) => this.terminalErrorMessage.set(message)));
    this.terminalSubscriptions.add(this.terminal.output$.subscribe((output) => this.terminalOutput.set({ data: output, sequence: this.terminalOutputSequence += 1 })));
    this.load();
  }

  public ngOnDestroy(): void { this.stopAutoRefresh(); this.terminal.disconnect(); this.terminalSubscriptions.unsubscribe(); }

  protected load(): void {
    this.installedServices.details(this.serviceId).subscribe({
      next: (details) => { this.details.set(details); this.logs.set(details.logs.value); this.configurationValues.set(this.toEditableValues(details.configuration.values)); this.connectInitialTerminal(details); this.message.set(null); },
      error: () => this.message.set('Could not load service details.')
    });
  }

  protected webUrl(ap: AccessPoint): string { return ap.url ?? `http://${ap.host}:${ap.hostPort ?? ap.port}`; }
  protected copy(value: string): void { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {}); }
  protected toggleSecret(key: string): void { const next = new Set(this.visibleSecrets()); next.has(key) ? next.delete(key) : next.add(key); this.visibleSecrets.set(next); }

  // Terminal event handlers
  protected onTerminalContainerChange(containerId: string): void {
    this.terminalContainerId.set(containerId);
    this.terminal.connect(this.serviceId, containerId);
  }

  protected onTerminalInput(data: string): void { this.terminal.write(data); }

  protected onTerminalResize(event: { cols: number; rows: number }): void { this.terminal.resize(event.cols, event.rows); }

  protected onTerminalDisconnect(): void {
    this.terminal.disconnect();
    this.terminalOutput.set(null);
  }

  protected runAction(action: 'start' | 'stop' | 'restart' | 'recreate'): void {
    this.actionInProgress.set(`${action} in progress…`);
    const request = action === 'start' ? this.installedServices.start(this.serviceId) : action === 'stop' ? this.installedServices.stop(this.serviceId) : action === 'restart' ? this.installedServices.restart(this.serviceId) : this.installedServices.recreate(this.serviceId);
    request.subscribe({ next: () => { this.actionInProgress.set(null); this.load(); }, error: () => { this.actionInProgress.set(null); this.message.set(`Could not ${action} service.`); } });
  }

  protected updateConfigurationValue(key: string, value: string): void { this.configurationValues.set({ ...this.configurationValues(), [key]: value }); }

  protected configurationSecretVisible(key: string): boolean { return this.visibleSecrets().has(`configuration:${key}`); }
  protected configurationInputType(field: { readonly key: string; readonly secret: boolean }): string { return field.secret && !this.configurationSecretVisible(field.key) ? 'password' : 'text'; }
  protected toggleConfigurationSecret(key: string): void { this.toggleSecret(`configuration:${key}`); }

  protected saveConfiguration(): void {
    this.confirmSaveConfiguration.set(false);
    this.actionInProgress.set('Applying configuration…');
    this.installedServices.updateConfiguration(this.serviceId, this.configurationValues()).subscribe({ next: () => { this.actionInProgress.set(null); this.load(); }, error: () => { this.actionInProgress.set(null); this.message.set('Could not save configuration.'); } });
  }

  protected recreateService(): void {
    this.confirmRecreate.set(false);
    this.runAction('recreate');
  }

  protected deleteService(): void {
    this.confirmDelete.set(false);
    this.actionInProgress.set('Deleting service…');
    this.installedServices.delete(this.serviceId).subscribe({ next: () => { void this.router.navigateByUrl('/installed'); }, error: () => { this.actionInProgress.set(null); this.message.set('Could not delete service.'); } });
  }

  protected toggleAutoRefresh(): void { this.autoRefresh() ? this.stopAutoRefresh() : this.startAutoRefresh(); }
  protected clearLogs(): void { this.logs.set(''); }
  protected readableDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  protected displayedLogs(details: InstalledServiceDetails): string {
    const value = this.logs() || this.presenter.logs(details);
    const selected = this.selectedLogContainer();
    if (selected === 'All containers') return value;
    return value.split('\n').filter((line) => line.includes(selected)).join('\n');
  }

  private startAutoRefresh(): void { this.autoRefresh.set(true); this.refreshLogs(); this.timer = setInterval(() => this.refreshLogs(), 3000); }
  private stopAutoRefresh(): void { this.autoRefresh.set(false); if (this.timer) clearInterval(this.timer); this.timer = null; }
  private refreshLogs(): void { this.installedServices.logs(this.serviceId).subscribe({ next: (result) => this.logs.set(result.logs), error: () => this.message.set('Could not refresh logs.') }); }
  private connectInitialTerminal(details: InstalledServiceDetails): void {
    const current = this.terminalContainerId();
    const connectable = details.containers.filter((container) => container.status === 'running');
    if (current && connectable.some((container) => container.id === current)) return;
    const first = connectable[0];
    if (!first) {
      this.terminalContainerId.set(null);
      this.terminal.disconnect();
      return;
    }
    this.terminalContainerId.set(first.id);
    this.terminal.connect(this.serviceId, first.id);
  }
  private toEditableValues(values: Readonly<Record<string, unknown>>): Record<string, string> { return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')])); }
}
