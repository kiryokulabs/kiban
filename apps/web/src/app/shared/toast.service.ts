import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly type: ToastType;
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  public readonly toasts = signal<readonly Toast[]>([]);

  public success(message: string): void {
    this.show(message, 'success', 3_000);
  }

  public error(message: string): void {
    this.show(message, 'error', 3_000);
  }

  public info(message: string): void {
    this.show(message, 'info', 3_000);
  }

  public dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(message: string, type: ToastType, duration: number): void {
    const toast: Toast = { id: this.nextId++, type, message };
    this.toasts.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(toast.id), duration);
  }
}
