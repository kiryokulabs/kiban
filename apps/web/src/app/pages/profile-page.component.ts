import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'kiban-profile-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-3xl">
      <p class="mb-3 text-sm font-medium text-zinc-500">Account</p>
      <h1 class="text-3xl font-semibold tracking-tight">Profile</h1>

      <section class="mt-8 rounded-xl border border-line bg-panel p-6">
        <h2 class="text-lg font-medium">User details</h2>
        <dl class="mt-5 space-y-4 text-sm">
          <div class="flex justify-between border-b border-line pb-3">
            <dt class="text-zinc-500">Email</dt>
            <dd>{{ auth.user()?.email }}</dd>
          </div>
          <div class="flex justify-between border-b border-line pb-3">
            <dt class="text-zinc-500">Role</dt>
            <dd class="capitalize">{{ auth.user()?.role }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-zinc-500">User ID</dt>
            <dd class="font-mono text-xs text-zinc-400">{{ auth.user()?.id }}</dd>
          </div>
        </dl>
      </section>

      <section class="mt-6 rounded-xl border border-line bg-panel p-6">
        <h2 class="text-lg font-medium">Change password</h2>
        <p class="mt-2 text-sm text-zinc-500">After changing your password, Kiban will log you out automatically.</p>

        <form class="mt-6 space-y-4" (ngSubmit)="submitPasswordChange()">
          <label class="block text-sm">
            <span class="mb-2 block text-zinc-400">Current password</span>
            <input name="currentPassword" type="password" autocomplete="current-password" [(ngModel)]="currentPassword" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500" required />
          </label>
          <label class="block text-sm">
            <span class="mb-2 block text-zinc-400">New password</span>
            <input name="newPassword" type="password" autocomplete="new-password" [(ngModel)]="newPassword" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500" required minlength="8" />
          </label>
          <label class="block text-sm">
            <span class="mb-2 block text-zinc-400">Confirm new password</span>
            <input name="confirmPassword" type="password" autocomplete="new-password" [(ngModel)]="confirmPassword" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500" required minlength="8" />
          </label>

          @if (message()) {
            <p class="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-300">{{ message() }}</p>
          }

          <button type="submit" class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60" [disabled]="loading()">
            {{ loading() ? 'Updating…' : 'Change password' }}
          </button>
        </form>
      </section>
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

  /** Changes the current password and relies on AuthService to clear local auth state. */
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
