import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-logs-page',
  standalone: true,
  imports: [IconsComponent],
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

      <div class="card flex flex-col items-center justify-center py-16 text-center">
        <div class="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand-light">
          <kiban-icon name="logs" [size]="20" />
        </div>
        <p class="text-sm font-medium kb-text">No logs yet</p>
        <p class="mt-1 text-xs c-muted">Service logs will appear here once services are running.</p>
      </div>
    </div>
  `
})
export class LogsPageComponent {}
