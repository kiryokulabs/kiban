import { Component, inject } from '@angular/core';
import { IconsComponent, type KibanIcon } from './icons.component';
import { ToastService, type ToastType } from './toast.service';

@Component({
  selector: 'kiban-toast',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <section class="pointer-events-none fixed inset-x-4 bottom-4 z-toast space-y-2 sm:left-auto sm:w-full sm:max-w-sm" aria-label="Notifications">
      @for (toast of notifications.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg"
          [class.border-success-border]="toast.type === 'success'"
          [class.bg-success-bg]="toast.type === 'success'"
          [class.border-danger-border]="toast.type === 'error'"
          [class.bg-danger-bg]="toast.type === 'error'"
          [class.border-brand]="toast.type === 'info'"
          [class.bg-brand-bg]="toast.type === 'info'"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <kiban-icon
            [name]="icon(toast.type)"
            [size]="16"
            class="mt-0.5 shrink-0"
            [class.text-success]="toast.type === 'success'"
            [class.text-danger]="toast.type === 'error'"
            [class.text-brand-light]="toast.type === 'info'"
          />
          <p class="min-w-0 flex-1 text-sm leading-5 text-white">{{ toast.message }}</p>
          <button type="button" class="btn-icon-close text-white -mr-1 -mt-1 shrink-0" aria-label="Dismiss notification" (click)="notifications.dismiss(toast.id)">
            <kiban-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </section>
  `
})
export class ToastComponent {
  protected readonly notifications = inject(ToastService);

  protected icon(type: ToastType): KibanIcon {
    if (type === 'success') return 'check';
    if (type === 'error') return 'warning';
    return 'info';
  }
}
