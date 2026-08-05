import { Component, input, output } from '@angular/core';
import { IconsComponent } from './icons.component';
import type { CategorySliderItem } from './category-slider.presenter';

/**
 * Horizontal category selector with native scrolling.
 *
 * It intentionally uses browser scrolling instead of external slider dependencies.
 */
@Component({
  selector: 'kiban-category-slider',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="group relative -mx-1 mt-4">
      <div class="flex items-center gap-1">
        <button type="button" class="btn-icon shrink-0" aria-label="Previous categories" (click)="scroll(track, -1)">
          <kiban-icon name="chevron-left" [size]="14" />
        </button>

        <div #track class="no-scrollbar flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto scroll-smooth px-1 py-1">
          @for (item of items(); track item.id) {
            <button
              type="button"
              class="btn shrink-0 snap-start gap-1 text-xs px-2.5 py-1.5"
              [class.btn-primary]="selectedId() === item.id"
              [class.btn-ghost]="selectedId() !== item.id"
              [attr.aria-pressed]="selectedId() === item.id"
              (click)="selectionChange.emit(item.id)"
            >
              <span>{{ item.label }}</span>
              <span class="opacity-70">{{ item.count }}</span>
            </button>
          }
        </div>

        <button type="button" class="btn-icon shrink-0" aria-label="Next categories" (click)="scroll(track, 1)">
          <kiban-icon name="chevron-right" [size]="14" />
        </button>
      </div>
    </div>
  `
})
export class CategorySliderComponent {
  public readonly items = input.required<readonly CategorySliderItem[]>();
  public readonly selectedId = input.required<string>();
  public readonly selectionChange = output<string>();

  protected scroll(track: HTMLElement, direction: -1 | 1): void {
    track.scrollBy({ left: direction * Math.max(240, track.clientWidth * 0.75), behavior: 'smooth' });
  }
}
