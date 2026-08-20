import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-auth-shell',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <main class="grid min-h-screen place-items-center surface-base px-6">
      <section class="w-full max-w-sm">
        @if (requiresAdminSetup() === null && !bootstrapError()) {
          <!-- Loading -->
          <div class="card p-8 text-center">
            <span
              class="h-7 w-7 shrink-0 bg-current"
              style="mask: url(assets/logo.svg) center / contain no-repeat; -webkit-mask: url(assets/logo.svg) center / contain no-repeat;"
              aria-hidden="true"
            ></span>
            <p class="text-sm c-muted">Checking Kiban API…</p>
          </div>
        } @else if (requiresAdminSetup() === null && bootstrapError()) {
          <!-- API unavailable -->
          <div class="card p-8">
            <div class="flex flex-col items-center text-center">
              <div class="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-danger/10" style="color: var(--color-danger)">
                <kiban-icon name="warning" [size]="20" />
              </div>
              <p class="text-sm font-medium kb-text">API unavailable</p>
              <h1 class="mt-1 text-lg font-semibold kb-text">Kiban API is not reachable</h1>
              <p class="mt-2 text-xs leading-relaxed c-muted">The web app cannot reach the backend API. Make sure the Kiban server is running.</p>
              <button type="button" class="btn-primary btn gap-1.5 mt-6" (click)="loadBootstrapStatus()">
                <kiban-icon name="refresh" [size]="14" />
                Retry
              </button>
            </div>
          </div>
        } @else {
          <!-- Auth form -->
          <div class="card p-6">
            <!-- Logo -->
            <div class="flex flex-col items-center mb-6">
              <span
                class="h-7 w-7 shrink-0 bg-current mb-4"
                style="mask: url(assets/logo.svg) center / contain no-repeat; -webkit-mask: url(assets/logo.svg) center / contain no-repeat;"
                aria-hidden="true"
              ></span>
              <p class="text-xs c-subtle uppercase tracking-wider">{{ eyebrow() }}</p>
              <h1 class="mt-1 text-lg font-semibold kb-text text-center">{{ title() }}</h1>
            </div>

            <form class="space-y-3" (ngSubmit)="submit()">
              <label class="block text-xs">
                <span class="mb-1.5 block c-muted">Email</span>
                <div class="relative">
                  <kiban-icon name="profile" [size]="14" class="absolute left-3 top-1/2 -translate-y-1/2 c-subtle pointer-events-none" />
                  <input name="email" type="email" autocomplete="email" [(ngModel)]="email" class="input pl-9" required />
                </div>
              </label>
              <label class="block text-xs">
                <span class="mb-1.5 block c-muted">Password</span>
                <div class="relative">
                  <kiban-icon name="eye" [size]="14" class="absolute left-3 top-1/2 -translate-y-1/2 c-subtle pointer-events-none" />
                  <input name="password" type="password" [autocomplete]="requiresAdminSetup() ? 'new-password' : 'current-password'" [(ngModel)]="password" class="input pl-9" required minlength="8" />
                </div>
              </label>

              @if (formError()) {
                <div class="card-subtle flex items-center gap-2.5 px-4 py-3" style="border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);">
                  <kiban-icon name="warning" [size]="14" style="color: var(--color-danger);" class="shrink-0" />
                  <p class="text-xs" style="color: var(--color-danger);">{{ formError() }}</p>
                </div>
              }

              <button type="submit" class="btn-primary btn w-full justify-center gap-1.5 mt-2" [disabled]="loading()">
                @if (loading()) {
                  <span class="animate-pulse">Please wait…</span>
                } @else {
                  <kiban-icon name="check" [size]="14" />
                  <span>{{ actionLabel() }}</span>
                }
              </button>
            </form>
            <p class="text-xs c-muted text-center max-w-xs mt-4">{{ description() }}</p>
          </div>
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
  protected readonly description = computed(() => (this.requiresAdminSetup() === true ? 'This account will become the only initial administrator for this Kiban installation.' : 'Public registration is disabled.'));
  protected readonly actionLabel = computed(() => (this.requiresAdminSetup() === true ? 'Create admin account' : 'Log in'));

  public constructor() {
    this.loadBootstrapStatus();
  }

  protected loadBootstrapStatus(): void {
    this.bootstrapError.set(false);
    this.formError.set(null);
    this.requiresAdminSetup.set(null);
    this.auth.bootstrapStatus().subscribe({
      next: (status) => this.requiresAdminSetup.set(status.requiresAdminSetup),
      error: () => this.bootstrapError.set(true)
    });
  }

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
