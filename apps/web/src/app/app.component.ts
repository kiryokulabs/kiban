import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthShellComponent } from './auth/auth-shell.component';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './theme/theme.service';

interface NavigationItem { readonly label: string; readonly path: string; readonly adminOnly?: boolean; }

@Component({
  selector: 'kiban-root',
  standalone: true,
  imports: [AuthShellComponent, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    @if (initializing()) {
      <main class="grid min-h-screen place-items-center kb-surface kb-muted">Loading Kiban…</main>
    } @else if (!auth.isAuthenticated()) {
      <kiban-auth-shell />
    } @else {
      <div class="min-h-screen kb-surface">
        <aside class="fixed inset-y-0 left-0 w-64 border-r kb-border kb-panel p-4">
          <div class="mb-8 flex items-center gap-3">
            <div class="grid h-9 w-9 place-items-center rounded-xl kb-logo text-sm font-bold">K</div>
            <div><p class="font-semibold kb-text">Kiban</p><p class="text-xs kb-muted">Infrastructure platform</p></div>
          </div>
          <nav class="space-y-1">
            @for (item of navigation(); track item.path) {
              @if (!item.adminOnly || auth.user()?.role === 'admin') {
                <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }" class="kb-nav-item block rounded-lg px-3 py-2 text-sm transition-colors">{{ item.label }}</a>
              }
            }
          </nav>
        </aside>
        <main class="pl-64">
          <header class="sticky top-0 z-10 border-b kb-border kb-header px-8 py-4 backdrop-blur">
            <div class="flex items-center justify-between">
              <p class="text-sm kb-muted">Foundation v0.1</p>
              <div class="flex items-center gap-2">
                <button class="kb-icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.label()" [title]="theme.label()">
                  @if (theme.theme() === 'dark') {
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  } @else {
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.99 13.31A8.5 8.5 0 0 1 10.69 3.01 7 7 0 1 0 20.99 13.31Z"/></svg>
                  }
                </button>
                <a routerLink="/profile" class="kb-nav-item rounded-lg px-2 py-1 text-sm transition-colors">{{ auth.user()?.email }}</a>
                <button class="kb-icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors" type="button" (click)="logout()" aria-label="Logout" title="Logout">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                </button>
              </div>
            </div>
          </header>
          <section class="p-8"><router-outlet /></section>
        </main>
      </div>
    }
  `})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly initializing = signal(true);
  protected readonly navigation = signal<readonly NavigationItem[]>([
    { label: 'Home', path: '/' },
    { label: 'Projects', path: '/projects' },
    { label: 'Catalog', path: '/catalog' },
    { label: 'Installed', path: '/installed' },
    { label: 'Users', path: '/users', adminOnly: true },
    { label: 'Logs', path: '/logs' },
    { label: 'Settings', path: '/settings' }
  ]);

  public constructor() {
    this.auth.me().subscribe({
      next: () => this.initializing.set(false),
      error: () => this.initializing.set(false)
    });
  }

  /** Ends the current API session. */
  protected logout(): void {
    this.auth.logout().subscribe();
  }
}
