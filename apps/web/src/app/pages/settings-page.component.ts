import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-settings-page',
  standalone: true,
  imports: [IconsComponent],
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

      <div class="card p-5">
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
    </div>
  `
})
export class SettingsPageComponent {}
