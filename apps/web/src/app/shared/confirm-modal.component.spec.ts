import { describe, expect, it } from 'vitest';
import { ConfirmationDialogPresenter } from './confirmation-dialog.presenter';

describe('ConfirmationDialogPresenter', () => {
  it('provides safe default labels for confirmation dialogs', () => {
    const presenter = new ConfirmationDialogPresenter();

    expect(presenter.defaults()).toEqual({
      title: 'Confirm action',
      message: '',
      cancelLabel: 'Cancel',
      confirmLabel: 'Confirm',
      destructive: false
    });
  });
});
