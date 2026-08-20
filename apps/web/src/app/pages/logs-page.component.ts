import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogsService } from '../logs/logs.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-logs-page',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <div class="space-y-6">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="logs" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Logs</h1>
        </div>
      </div>

      <div class="card p-4 flex flex-col min-h-80 max-h-[40rem]">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="logs" [size]="14" /> Kiban platform logs</h2>
            <p class="mt-1 text-xs c-muted">Core runtime logs for kiban-api and kiban-web.</p>
          </div>
          <div class="flex items-center gap-1">
            <select class="input h-8 w-36 py-1 text-xs" [ngModel]="selectedLogContainer()" (ngModelChange)="selectedLogContainer.set($event)">
              @for (option of logContainerOptions; track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
            <button class="btn-icon shrink-0" type="button" (click)="toggleAutoRefresh()" [title]="autoRefresh() ? 'Stop auto-refresh' : 'Start auto-refresh'"><kiban-icon [name]="autoRefresh() ? 'stop' : 'play'" [size]="12" /></button>
            <button class="btn-icon shrink-0" type="button" (click)="loadLogs()" [disabled]="loading()" title="Refresh logs"><kiban-icon name="refresh" [size]="12" /></button>
            <button class="btn-icon shrink-0" type="button" (click)="clearLogs()" title="Clear logs"><kiban-icon name="x" [size]="12" /></button>
            <button class="btn-icon shrink-0" type="button" (click)="copy(displayedLogs())" title="Copy logs"><kiban-icon name="copy" [size]="12" /></button>
          </div>
        </div>

        @if (loading()) {
          <p class="mt-4 text-xs c-muted">Loading logs…</p>
        } @else if (message()) {
          <div class="card-subtle mt-4 px-4 py-3 text-xs c-muted">{{ message() }}</div>
        } @else {
          <pre class="mt-3 flex-1 overflow-auto rounded-lg border kb-border p-3 text-xs c-muted">{{ displayedLogs() || 'No logs yet.' }}</pre>
        }
      </div>
    </div>
  `
})
export class LogsPageComponent implements OnDestroy {
  private readonly logsService = inject(LogsService);

  protected readonly logContainerOptions = ['All containers', 'kiban-api', 'kiban-web'];
  protected readonly loading = signal(false);
  protected readonly logs = signal('');
  protected readonly message = signal<string | null>(null);
  protected readonly selectedLogContainer = signal('All containers');
  protected readonly autoRefresh = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor() {
    this.loadLogs();
  }

  public ngOnDestroy(): void { this.stopAutoRefresh(); }

  protected loadLogs(): void {
    this.loading.set(true);
    this.message.set(null);
    this.logsService.kiban().subscribe({
      next: (result) => {
        this.loading.set(false);
        this.logs.set(result.logs);
        this.message.set(result.available ? null : result.message);
      },
      error: () => {
        this.loading.set(false);
        this.message.set('Could not load Kiban logs.');
      }
    });
  }

  protected toggleAutoRefresh(): void { this.autoRefresh() ? this.stopAutoRefresh() : this.startAutoRefresh(); }
  protected clearLogs(): void { this.logs.set(''); }
  protected copy(value: string): void { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {}); }
  protected displayedLogs(): string {
    const selected = this.selectedLogContainer();
    const value = this.logs();
    if (selected === 'All containers') return value;
    return value.split('\n').filter((line) => line.includes(selected)).join('\n');
  }

  private startAutoRefresh(): void { this.autoRefresh.set(true); this.loadLogs(); this.timer = setInterval(() => this.loadLogs(), 3000); }
  private stopAutoRefresh(): void { this.autoRefresh.set(false); if (this.timer) clearInterval(this.timer); this.timer = null; }
}
