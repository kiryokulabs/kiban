import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from './modal.component';
import { IconsComponent } from './icons.component';
import { ConfirmationDialogPresenter } from './confirmation-dialog.presenter';

/**
 * Reusable confirmation dialog for destructive or important actions.
 */
@Component({
  selector: 'kiban-confirm-modal',
  standalone: true,
  imports: [FormsModule, ModalComponent, IconsComponent],
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
      @if (confirmationText) {
        <label class="mt-4 block text-xs">
          <span class="mb-4 block c-muted">Type <strong class="kb-text">{{ confirmationText }}</strong> to confirm</span>
          <input name="confirmationValue" [(ngModel)]="confirmationValue" class="input" autocomplete="off" />
        </label>
      }
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn-ghost btn mt-4" type="button" (click)="cancelAction()">{{ cancelLabel }}</button>
        <button
          class="btn gap-1.5 mt-4"
          [class.btn-danger]="destructive"
          [class.btn-primary]="!destructive"
          type="button"
          [disabled]="!canConfirm()"
          (click)="confirmAction()"
        >
          @if (destructive) { <kiban-icon name="trash" [size]="14" style="color: var(--color-danger);" /> }
          {{ confirmLabel }}
        </button>
      </div>
    </kiban-modal>
  `
})
export class ConfirmModalComponent {
  private readonly presenter = new ConfirmationDialogPresenter();

  @Input() public title = 'Confirm action';
  @Input() public message = '';
  @Input() public cancelLabel = 'Cancel';
  @Input() public confirmLabel = 'Confirm';
  @Input() public destructive = false;
  @Input() public confirmationText = '';

  public confirmationValue = '';

  @Output() public readonly confirm = new EventEmitter<void>();
  @Output() public readonly cancel = new EventEmitter<void>();

  public confirmAction(): void {
    if (!this.canConfirm()) return;
    this.confirm.emit();
  }

  public canConfirm(): boolean {
    return this.presenter.canConfirm(this.confirmationValue, this.confirmationText);
  }

  public cancelAction(): void {
    this.cancel.emit();
  }
}
