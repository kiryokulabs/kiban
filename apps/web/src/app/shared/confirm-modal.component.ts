import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationDialogPresenter } from './confirmation-dialog.presenter';
import { ModalComponent } from './modal.component';

/**
 * Reusable confirmation dialog for destructive or important actions.
 */
@Component({
  selector: 'kiban-confirm-modal',
  standalone: true,
  imports: [ModalComponent],
  template: `
    <kiban-modal [title]="title" (close)="cancelAction()">
      <p class="text-sm leading-6 kb-muted">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted transition hover:kb-text" type="button" (click)="cancelAction()">{{ cancelLabel }}</button>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition"
          [class.bg-red-500]="destructive"
          [class.text-white]="destructive"
          [class.hover:bg-red-400]="destructive"
          [class.bg-zinc-100]="!destructive"
          [class.text-zinc-950]="!destructive"
          type="button"
          (click)="confirmAction()"
        >{{ confirmLabel }}</button>
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
