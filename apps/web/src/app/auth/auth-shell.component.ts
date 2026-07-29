import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'kiban-auth-shell',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="grid min-h-screen place-items-center bg-surface px-6 text-zinc-100">
      <section class="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-2xl shadow-black/20">
        @if (requiresAdminSetup() === null && !bootstrapError()) {
          <div class="py-10 text-center">
            <div class="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-950">K</div>
            <p class="text-sm text-zinc-500">Checking Kiban API…</p>
          </div>
        } @else if (requiresAdminSetup() === null && bootstrapError()) {
          <div class="py-8">
            <div class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-950">K</div>
            <p class="text-sm text-red-300">API unavailable</p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight">Kiban API is not reachable</h1>
            <p class="mt-2 text-sm text-zinc-400">The web app cannot decide whether to show admin setup or login until the API answers <code class="text-zinc-300">/auth/bootstrap-status</code>.</p>
            <button type="button" class="mt-6 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" (click)="loadBootstrapStatus()">Retry</button>
          </div>
        } @else {
          <div class="mb-8">
            <div class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-950">K</div>
            <p class="text-sm text-zinc-500">{{ eyebrow() }}</p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight">{{ title() }}</h1>
            <p class="mt-2 text-sm text-zinc-400">{{ description() }}</p>
          </div>

          <form class="space-y-4" (ngSubmit)="submit()">
            <label class="block text-sm">
              <span class="mb-2 block text-zinc-400">Email</span>
              <input name="email" type="email" autocomplete="email" [(ngModel)]="email" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500" required />
            </label>
            <label class="block text-sm">
              <span class="mb-2 block text-zinc-400">Password</span>
              <input name="password" type="password" [autocomplete]="requiresAdminSetup() ? 'new-password' : 'current-password'" [(ngModel)]="password" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500" required minlength="8" />
            </label>

            @if (formError()) {
              <p class="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ formError() }}</p>
            }

            <button type="submit" class="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60" [disabled]="loading()">
              {{ loading() ? 'Please wait…' : actionLabel() }}
            </button>
          </form>
        }
      </section>
    </main>
  `
})
export class AuthShellComponent {
  private readonly auth = inject(AuthService);

  public email = '';
  public password = '';
  protected readonly loading = signal(false);
  protected readonly bootstrapError = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly requiresAdminSetup = signal<boolean | null>(null);

  protected readonly eyebrow = computed(() => (this.requiresAdminSetup() === true ? 'First run setup' : 'Welcome back'));
  protected readonly title = computed(() => (this.requiresAdminSetup() === true ? 'Create admin account' : 'Log in to Kiban'));
  protected readonly description = computed(() => (this.requiresAdminSetup() === true ? 'This account will become the only initial administrator for this Kiban installation.' : 'An admin account already exists. Public registration is disabled.'));
  protected readonly actionLabel = computed(() => (this.requiresAdminSetup() === true ? 'Create admin account' : 'Log in'));

  public constructor() {
    this.loadBootstrapStatus();
  }

  /** Loads the install bootstrap status before deciding between setup and login. */
  protected loadBootstrapStatus(): void {
    this.bootstrapError.set(false);
    this.formError.set(null);
    this.requiresAdminSetup.set(null);
    this.auth.bootstrapStatus().subscribe({
      next: (status) => this.requiresAdminSetup.set(status.requiresAdminSetup),
      error: () => this.bootstrapError.set(true)
    });
  }

  /** Submits either the first-admin setup or normal login flow. */
  protected submit(): void {
    if (this.loading() || this.requiresAdminSetup() === null) {
      return;
    }

    this.loading.set(true);
    this.formError.set(null);
    const request = this.requiresAdminSetup() ? this.auth.registerAdmin({ email: this.email, password: this.password }) : this.auth.login({ email: this.email, password: this.password });
    request.subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.formError.set(this.requiresAdminSetup() ? 'Could not create the admin account.' : 'Invalid email or password.');
      }
    });
  }
}
