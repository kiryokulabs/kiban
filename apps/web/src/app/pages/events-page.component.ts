import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivityApiService } from '../activity/activity-api.service';
import { ACTIVITY_PRESENTATION, type ActivityEvent } from '../activity/activity.models';
import { EventsHeaderComponent } from '../activity/events-header.component';
import { IconsComponent } from '../shared/icons.component';

/** Paginated operational history; shares navigation, not data, with technical logs. */
@Component({
  selector: 'kiban-events-page',
  standalone: true,
  imports: [DatePipe, EventsHeaderComponent, IconsComponent],
  template: `
    <div class="space-y-6">
      <kiban-events-header active="events" />
      <section class="card overflow-hidden" aria-labelledby="event-history-heading">
        <div class="border-b kb-border px-5 py-3">
          <h2 id="event-history-heading" class="text-sm font-medium kb-text">Event history</h2>
          <p class="mt-1 text-xs c-muted">Project, environment and service activity. The latest 1,000 events are retained.</p>
        </div>
        @if (loading()) {
          <p class="px-5 py-8 text-sm c-muted" role="status">Loading events...</p>
        } @else if (error()) {
          <div class="space-y-3 px-5 py-8">
            <p class="text-sm text-red-500" role="alert">Could not load event history.</p>
            <button type="button" class="btn-secondary btn gap-1.5" (click)="loadPage(page())">
              <kiban-icon name="refresh" [size]="14" />
              Reload history
            </button>
          </div>
        } @else {
          <ol class="divide-y kb-border">
            @for (event of events(); track event.id) {
              <li class="flex items-start gap-3 px-5 py-4">
                <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-light">
                  <kiban-icon [name]="presentation[event.action].icon" [size]="15" />
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div class="min-w-0">
                    <p class="break-words text-sm font-medium kb-text">{{ event.resourceName }} {{ presentation[event.action].verb }}</p>
                    <p class="mt-1 break-words text-xs c-muted">{{ event.projectName }}@if (event.environmentName) { / {{ event.environmentName }} }</p>
                  </div>
                  <div class="min-w-0 shrink-0 sm:max-w-[45%] sm:text-right">
                    <p class="break-all text-xs c-muted">{{ event.actorEmail }}</p>
                    <p class="mt-1 text-[11px] c-subtle">{{ event.createdAt | date:'medium' }}</p>
                  </div>
                </div>
              </li>
            } @empty {
              <li class="px-5 py-10 text-center text-sm c-muted">No events found.</li>
            }
          </ol>
        }
        <div class="flex items-center justify-end gap-3 border-t kb-border px-5 py-3">
          @if (!loading() && !error()) {
            <span class="mr-auto text-xs c-muted">{{ total() }} {{ total() === 1 ? 'event' : 'events' }}</span>
          }
          <button type="button" class="btn-secondary btn gap-1.5" [disabled]="loading() || page() <= 1" (click)="loadPage(page() - 1)">
            <kiban-icon name="chevron-left" [size]="14" />
          </button>
          <span class="text-xs c-muted" aria-live="polite">Page {{ page() }}</span>
          <button type="button" class="btn-secondary btn gap-1.5" [disabled]="loading() || error() || !hasMore()" (click)="loadPage(page() + 1)">
            <kiban-icon name="chevron-right" [size]="14" />
          </button>
        </div>
      </section>
    </div>
  `
})
export class EventsPageComponent {
  private readonly api = inject(ActivityApiService);
  protected readonly presentation = ACTIVITY_PRESENTATION;
  protected readonly events = signal<readonly ActivityEvent[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly hasMore = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  public constructor() { this.loadPage(1); }

  protected loadPage(page: number): void {
    if (this.loading() || page < 1) return;
    this.loading.set(true);
    this.error.set(false);
    this.api.history(page).subscribe({
      next: result => { this.events.set(result.items); this.total.set(result.total); this.page.set(result.page); this.hasMore.set(result.hasMore); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }
}
