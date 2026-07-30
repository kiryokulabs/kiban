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
        class="w-full max-w-md rounded-xl border kb-border surface-elevated shadow-xl animate-[fadeIn_150ms_ease-out]"
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

  /** Emitted when the user asks to dismiss the modal. */
  @Output() public readonly close = new EventEmitter<void>();
}
