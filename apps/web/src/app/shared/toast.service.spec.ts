import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows and automatically dismisses a success toast', () => {
    vi.useFakeTimers();
    const service = new ToastService();

    service.success('PostgreSQL installed successfully.');

    expect(service.toasts()).toEqual([
      { id: 1, type: 'success', message: 'PostgreSQL installed successfully.' }
    ]);

    vi.runAllTimers();

    expect(service.toasts()).toEqual([]);
  });

  it('shows an error toast until it is dismissed', () => {
    const service = new ToastService();

    service.error('Could not install PostgreSQL.');
    const toast = service.toasts()[0]!;
    service.dismiss(toast.id);

    expect(service.toasts()).toEqual([]);
  });
});
