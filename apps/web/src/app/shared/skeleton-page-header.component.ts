import { Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'kiban-skeleton-page-header',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <kiban-skeleton width="1.75rem" height="1.75rem" blockClass="rounded-lg" />
        <div class="space-y-1.5">
          <kiban-skeleton width="8rem" height="1.25rem" />
          <kiban-skeleton width="14rem" height="0.75rem" />
        </div>
      </div>
      <kiban-skeleton width="5rem" height="2rem" blockClass="rounded-lg" />
    </div>
  `
})
export class SkeletonPageHeaderComponent {}
