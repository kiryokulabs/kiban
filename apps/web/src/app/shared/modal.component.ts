import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconsComponent } from './icons.component';

/**
 * Shared modal shell used by feature-specific dialogs.
 */
@Component({
  selector: 'kiban-modal',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="fixed inset-0 z-modal-backdrop grid place-items-center bg-black/60 p-4 md:p-6" role="presentation">
      <section
        class="w-full rounded-xl border kb-border surface-elevated shadow-xl animate-[fadeIn_150ms_ease-out]"
        [class.max-w-md]="!wide"
        [class.max-w-3xl]="wide"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
      >
        <div class="flex items-center justify-between gap-3 px-5 py-4 border-b kb-border">
          <h2 class="text-sm font-medium kb-text">{{ title }}</h2>
          <button class="btn-icon" type="button" aria-label="Close modal" (click)="close.emit()">
            <kiban-icon name="x" [size]="14" />
          </button>
        </div>
        <div class="px-5 py-4">
          <ng-content />
        </div>
      </section>
    </div>
  `
})
export class ModalComponent {
  /** Modal title exposed to users and assistive technologies. */
  @Input() public title = '';

  /** Allows feature dialogs with denser selection UIs to use a wider shell. */
  @Input() public wide = false;

  /** Emitted when the user asks to dismiss the modal. */
  @Output() public readonly close = new EventEmitter<void>();
}
