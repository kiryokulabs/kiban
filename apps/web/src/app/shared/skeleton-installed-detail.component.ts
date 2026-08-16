import { Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'kiban-skeleton-installed-detail',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-3">
          <kiban-skeleton width="6rem" height="0.75rem" />
          <div class="flex items-center gap-3">
            <kiban-skeleton width="3rem" height="3rem" blockClass="rounded-xl" />
            <div class="space-y-1.5">
              <kiban-skeleton width="12rem" height="1.25rem" />
              <kiban-skeleton width="20rem" height="0.75rem" />
            </div>
          </div>
        </div>
        <kiban-skeleton width="5rem" height="2rem" blockClass="rounded-lg" />
      </div>

      <!-- Info cards row -->
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="card p-4 space-y-2">
            <kiban-skeleton width="3rem" height="0.625rem" />
            <kiban-skeleton width="5rem" height="0.875rem" />
            <kiban-skeleton width="7rem" height="0.625rem" />
          </div>
        }
      </div>

      <!-- Two column section -->
      <div class="grid gap-4 xl:grid-cols-2">
        <div class="card p-4 space-y-3">
          <kiban-skeleton width="8rem" height="0.875rem" />
          <div class="grid gap-3 sm:grid-cols-2">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="space-y-1">
                <kiban-skeleton width="3rem" height="0.5rem" />
                <kiban-skeleton width="6rem" height="0.75rem" />
              </div>
            }
          </div>
        </div>
        <div class="card p-4 space-y-3">
          <kiban-skeleton width="5rem" height="0.875rem" />
          <div class="space-y-2">
            @for (i of [1, 2, 3]; track i) {
              <div class="flex justify-between rounded-lg border kb-border px-3 py-2">
                <kiban-skeleton width="5rem" height="0.75rem" />
                <kiban-skeleton width="4rem" height="0.75rem" />
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Access section -->
      <div class="card p-4 space-y-3">
        <kiban-skeleton width="5rem" height="0.875rem" />
        <div class="grid gap-2 lg:grid-cols-2">
          @for (i of [1, 2]; track i) {
            <div class="flex items-center justify-between rounded-lg border kb-border px-3 py-2">
              <kiban-skeleton width="10rem" height="0.75rem" />
              <div class="flex gap-1">
                <kiban-skeleton width="1.75rem" height="1.75rem" blockClass="rounded-md" />
                <kiban-skeleton width="1.75rem" height="1.75rem" blockClass="rounded-md" />
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Actions section -->
      <div class="card p-4 space-y-3">
        <kiban-skeleton width="5rem" height="0.875rem" />
        <div class="flex gap-2">
          @for (i of [1, 2, 3]; track i) {
            <kiban-skeleton width="5rem" height="2rem" blockClass="rounded-lg" />
          }
        </div>
      </div>
    </div>
  `
})
export class SkeletonInstalledDetailComponent {}
