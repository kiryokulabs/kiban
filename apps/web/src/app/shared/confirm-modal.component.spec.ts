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

  it('requires an exact confirmation value when one is configured', () => {
    const presenter = new ConfirmationDialogPresenter();

    expect(presenter.canConfirm('Production', 'Production')).toBe(true);
    expect(presenter.canConfirm('production', 'Production')).toBe(false);
    expect(presenter.canConfirm(' Production ', 'Production')).toBe(false);
  });

  it('allows confirmation without a configured value', () => {
    const presenter = new ConfirmationDialogPresenter();

    expect(presenter.canConfirm('', '')).toBe(true);
  });
});
