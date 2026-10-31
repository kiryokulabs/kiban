import { Component, EventEmitter, Input, Output, signal, OnInit } from '@angular/core';
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
        [class.max-w-md]="!wide && !expanded()"
        [class.max-w-3xl]="wide && !expanded()"
        [class.max-w-6xl]="expanded()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
      >
        <div class="flex items-center justify-between gap-3 px-5 py-4 border-b kb-border">
          <h2 class="text-sm font-medium kb-text">{{ title }}</h2>
          <div class="flex items-center gap-2">
          @if (expandable) {
            <button class="btn-icon" type="button" [attr.aria-label]="expanded() ? 'Restore modal size' : 'Expand modal'" [attr.title]="expanded() ? 'Restore modal size' : 'Expand modal'" [attr.aria-pressed]="expanded()" (click)="expanded.set(!expanded())">
              <kiban-icon [name]="expanded() ? 'minimize' : 'maximize'" [size]="14" />
            </button>
          }
          <button class="btn-icon" type="button" aria-label="Close modal" (click)="close.emit()">
            <kiban-icon name="x" [size]="14" />
          </button>
          </div>
        </div>
        <div class="px-5 py-4 mt-3 space-y-1 overflow-auto" [class.max-h-96]="!expanded()" [class.max-h-[75vh]]="expanded()">
          <ng-content />
        </div>
      </section>
    </div>
  `
})
export class ModalComponent implements OnInit {
  @Input() public title = '';
  @Input() public wide = false;
  @Input() public expandable = false;
  @Input() public initiallyExpanded = false;

  public readonly expanded = signal(false);

  public ngOnInit(): void {
    this.expanded.set(this.initiallyExpanded);
  }

  /** Emitted when the user asks to dismiss the modal. */
  @Output() public readonly close = new EventEmitter<void>();
}
