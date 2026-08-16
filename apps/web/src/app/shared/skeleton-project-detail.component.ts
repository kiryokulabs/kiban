import { Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';
import { SkeletonCardComponent } from './skeleton-card.component';

@Component({
  selector: 'kiban-skeleton-project-detail',
  standalone: true,
  imports: [SkeletonComponent, SkeletonCardComponent],
  template: `
    <div class="space-y-6">
      <!-- Back button -->
      <div class="flex items-center gap-3">
        <kiban-skeleton width="5rem" height="1.5rem" blockClass="rounded-lg" />
      </div>

      <!-- Project header card -->
      <div class="card p-5">
        <div class="flex items-center gap-3">
          <kiban-skeleton width="2rem" height="2rem" blockClass="rounded-lg" />
          <div class="space-y-1.5">
            <kiban-skeleton width="10rem" height="1.25rem" />
            <kiban-skeleton width="16rem" height="0.75rem" />
          </div>
        </div>
      </div>

      <!-- Environment cards grid -->
      <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="card flex flex-col overflow-hidden">
            <div class="border-b kb-border px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <kiban-skeleton width="6rem" height="0.875rem" />
                  <kiban-skeleton width="3rem" height="1.25rem" blockClass="rounded-full" />
                </div>
                <kiban-skeleton width="2rem" height="0.625rem" />
              </div>
              <kiban-skeleton width="80%" height="0.625rem" blockClass="mt-2" />
            </div>
            <div class="flex-1 p-4">
              <div class="flex items-center justify-between mb-3">
                <kiban-skeleton width="5rem" height="0.625rem" />
                <kiban-skeleton width="4rem" height="1.5rem" blockClass="rounded-lg" />
              </div>
              <div class="space-y-2">
                @for (j of [1, 2]; track j) {
                  <div class="rounded-lg border kb-border p-3">
                    <div class="flex items-center gap-2">
                      <kiban-skeleton width="2.5rem" height="2.5rem" blockClass="rounded-lg" />
                      <div class="flex-1 space-y-1">
                        <kiban-skeleton width="50%" height="0.75rem" />
                        <kiban-skeleton width="30%" height="0.625rem" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class SkeletonProjectDetailComponent {}
