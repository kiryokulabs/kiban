import { Component, inject } from '@angular/core';
import { LoadingService } from '../core/loading.service';

@Component({
  selector: 'kiban-progress-bar',
  standalone: true,
  template: `
    @if (loading.active()) {
      <div class="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden">
        <div class="h-full w-1/3 rounded-full animate-[kiban-progress_1.1s_ease-in-out_infinite] progress-bar-fill"></div>
      </div>
    }
  `,
  styles: `
    .progress-bar-fill {
      background-color: var(--color-brand);
    }
  `
})
export class ProgressBarComponent {
  protected readonly loading = inject(LoadingService);
}
