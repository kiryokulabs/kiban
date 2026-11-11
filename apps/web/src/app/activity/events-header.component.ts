import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconsComponent } from '../shared/icons.component';

/** Shared page header with bookmarkable button-style navigation between server maintenance, events and logs. */
@Component({
  selector: 'kiban-events-header',
  standalone: true,
  imports: [RouterLink, IconsComponent],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
          <kiban-icon name="activity" [size]="15" />
        </div>
        <h1 class="text-xl font-semibold kb-text">Server</h1>
      </div>
      <nav class="flex flex-wrap items-center gap-2" aria-label="Server sections">
        <a routerLink="/server" class="btn gap-1.5" [class.btn-secondary]="active() === 'events'" [class.btn-ghost]="active() !== 'events'" [attr.aria-current]="active() === 'events' ? 'page' : null">
          <kiban-icon name="activity" [size]="14" />
          Events
        </a>
        <a routerLink="/server/logs" class="btn gap-1.5" [class.btn-secondary]="active() === 'logs'" [class.btn-ghost]="active() !== 'logs'" [attr.aria-current]="active() === 'logs' ? 'page' : null">
          <kiban-icon name="logs" [size]="14" />
          Logs
        </a>
        <a routerLink="/server/images" class="btn gap-1.5" [class.btn-secondary]="active() === 'images'" [class.btn-ghost]="active() !== 'images'" [attr.aria-current]="active() === 'images' ? 'page' : null">
          <kiban-icon name="box" [size]="14" />
          Docker Images
        </a>
      </nav>
    </div>
  `
})
export class EventsHeaderComponent {
  public readonly active = input.required<'events' | 'logs' | 'images'>();
}
