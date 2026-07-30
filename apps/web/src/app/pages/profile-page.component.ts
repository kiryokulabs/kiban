import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-profile-page',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <div class="space-y-6 max-w-2xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="profile" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Profile</h1>
        </div>
      </div>

      <!-- User details -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-10 w-10 place-items-center rounded-xl bg-brand/20 text-brand-light text-sm font-semibold">
            {{ (auth.user()?.email ?? '?').charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 class="text-sm font-medium kb-text">User details</h2>
            <p class="text-xs c-muted">{{ auth.user()?.email }}</p>
          </div>
        </div>
        <dl class="space-y-3 text-sm border-t kb-border pt-4">
          <div class="flex items-center justify-between">
            <dt class="text-xs c-muted">Email</dt>
            <dd class="text-xs kb-text">{{ auth.user()?.email }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-xs c-muted">Role</dt>
            <dd class="badge text-[9px] px-1 py-0.5 leading-none">{{ auth.user()?.role }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-xs c-muted">User ID</dt>
            <dd class="text-xs font-mono c-subtle">{{ auth.user()?.id }}</dd>
          </div>
        </dl>
      </div>

      <!-- Change password -->
      <div class="card p-5">
        <div class="flex items-center gap-2 mb-1">
          <kiban-icon name="edit" [size]="14" class="c-muted" />
          <h2 class="text-sm font-medium kb-text">Change password</h2>
        </div>
        <p class="text-xs c-muted mb-4">After changing your password, Kiban will log you out automatically.</p>

        <form class="space-y-3" (ngSubmit)="submitPasswordChange()">
          <label class="block text-xs">
            <span class="mb-1.5 block c-muted">Current password</span>
            <input name="currentPassword" type="password" autocomplete="current-password" [(ngModel)]="currentPassword" class="input" required />
          </label>
          <label class="block text-xs">
            <span class="mb-1.5 block c-muted">New password</span>
            <input name="newPassword" type="password" autocomplete="new-password" [(ngModel)]="newPassword" class="input" required minlength="8" />
          </label>
          <label class="block text-xs">
            <span class="mb-1.5 block c-muted">Confirm new password</span>
            <input name="confirmPassword" type="password" autocomplete="new-password" [(ngModel)]="confirmPassword" class="input" required minlength="8" />
          </label>

          @if (message()) {
            <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
              <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
              <p class="text-sm c-muted">{{ message() }}</p>
            </div>
          }

          <button type="submit" class="btn-primary btn gap-1.5" [disabled]="loading()">
            @if (loading()) {
              <span>Updating…</span>
            } @else {
              <kiban-icon name="check" [size]="14" />
              <span>Change password</span>
            }
          </button>
        </form>
      </div>
    </div>
  `
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly loading = signal(false);
  protected readonly message = signal<string | null>(null);

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';

  protected submitPasswordChange(): void {
    if (this.loading()) {
      return;
    }

    if (this.newPassword.length < 8) {
      this.message.set('New password must be at least 8 characters.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.message.set('New password confirmation does not match.');
      return;
    }

    this.loading.set(true);
    this.message.set(null);
    this.auth.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.message.set('Password changed. Logging out…');
      },
      error: () => {
        this.loading.set(false);
        this.message.set('Could not change password. Check your current password.');
      }
    });
  }
}
