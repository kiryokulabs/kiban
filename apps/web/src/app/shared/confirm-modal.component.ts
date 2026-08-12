import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationDialogPresenter } from './confirmation-dialog.presenter';
import { ModalComponent } from './modal.component';
import { IconsComponent } from './icons.component';

/**
 * Reusable confirmation dialog for destructive or important actions.
 */
@Component({
  selector: 'kiban-confirm-modal',
  standalone: true,
  imports: [ModalComponent, IconsComponent],
  template: `
    <kiban-modal [title]="title" (close)="cancelAction()">
      @if (destructive) {
        <div class="flex items-start gap-3 mb-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger/10" style="color: var(--color-danger)">
            <kiban-icon name="warning" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Are you sure?</p>
            <p class="mt-1 text-xs leading-relaxed c-muted">{{ message }}</p>
          </div>
        </div>
      } @else {
        <p class="text-sm leading-relaxed c-muted">{{ message }}</p>
      }
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn-ghost btn" type="button" (click)="cancelAction()">{{ cancelLabel }}</button>
        <button
          class="btn gap-1.5"
          [class.btn-danger]="destructive"
          [class.btn-primary]="!destructive"
          type="button"
          (click)="confirmAction()"
        >
          @if (destructive) { <kiban-icon name="trash" [size]="14" /> }
          {{ confirmLabel }}
        </button>
      </div>
    </kiban-modal>
  `
})
export class ConfirmModalComponent {
  private readonly presenter = new ConfirmationDialogPresenter();
  private readonly copy = this.presenter.defaults();

  /** Dialog title. */
  @Input() public title = this.copy.title;

  /** Explanation of what will happen if the user confirms. */
  @Input() public message = this.copy.message;

  /** Secondary action label. */
  @Input() public cancelLabel = this.copy.cancelLabel;

  /** Primary action label. */
  @Input() public confirmLabel = this.copy.confirmLabel;

  /** Whether the primary action should be styled as destructive. */
  @Input() public destructive = this.copy.destructive;

  /** Emitted when the user confirms the action. */
  @Output() public readonly confirm = new EventEmitter<void>();

  /** Emitted when the user cancels or closes the dialog. */
  @Output() public readonly cancel = new EventEmitter<void>();

  /** Confirms the pending action. */
  public confirmAction(): void {
    this.confirm.emit();
  }

  /** Cancels the pending action. */
  public cancelAction(): void {
    this.cancel.emit();
  }
}
