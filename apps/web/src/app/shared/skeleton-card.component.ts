import { Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'kiban-skeleton-card',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="card p-4 space-y-3">
      <div class="flex items-center gap-3">
        <kiban-skeleton width="2.5rem" height="2.5rem" blockClass="rounded-lg" />
        <div class="flex-1 space-y-2">
          <kiban-skeleton width="60%" height="0.875rem" />
          <kiban-skeleton width="40%" height="0.625rem" />
        </div>
      </div>
      <div class="space-y-2">
        <kiban-skeleton width="100%" height="0.625rem" />
        <kiban-skeleton width="80%" height="0.625rem" />
        <kiban-skeleton width="60%" height="0.625rem" />
      </div>
      <div class="flex gap-2 pt-2">
        <kiban-skeleton width="4rem" height="1.75rem" blockClass="rounded-lg" />
        <kiban-skeleton width="4rem" height="1.75rem" blockClass="rounded-lg" />
        <kiban-skeleton width="4rem" height="1.75rem" blockClass="rounded-lg" />
      </div>
    </div>
  `
})
export class SkeletonCardComponent {}
