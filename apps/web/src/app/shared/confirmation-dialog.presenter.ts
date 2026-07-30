export interface ConfirmationDialogCopy {
  readonly title: string;
  readonly message: string;
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly destructive: boolean;
}

/**
 * Framework-free defaults for confirmation dialogs.
 */
export class ConfirmationDialogPresenter {
  /** Returns copy defaults for a reusable confirmation dialog. */
  public defaults(): ConfirmationDialogCopy {
    return {
      title: 'Confirm action',
      message: '',
      cancelLabel: 'Cancel',
      confirmLabel: 'Confirm',
      destructive: false
    };
  }
}
