import { Component, input } from '@angular/core';

@Component({
  selector: 'kiban-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton rounded-md animate-pulse"
      [style.width]="width()"
      [style.height]="height()"
      [class]="blockClass()"
    ></div>
  `,
  styles: `
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-line-subtle) 25%,
        color-mix(in srgb, var(--color-brand) 15%, var(--color-line)) 37%,
        var(--color-line-subtle) 63%
      );
      background-size: 400% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `
})
export class SkeletonComponent {
  width = input<string>('100%');
  height = input<string>('1rem');
  blockClass = input<string>('');
}
