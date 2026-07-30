import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Shared modal shell used by feature-specific dialogs.
 */
@Component({
  selector: 'kiban-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6" role="presentation">
      <section class="w-full max-w-md rounded-xl border kb-border kb-panel p-6 shadow-2xl" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <div class="flex items-start justify-between gap-4">
          <h2 class="text-lg font-medium kb-text">{{ title }}</h2>
          <button class="rounded-lg border kb-border p-2 kb-muted transition hover:kb-text" type="button" aria-label="Close modal" (click)="close.emit()">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div class="mt-5">
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
