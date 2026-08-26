import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthShellComponent } from './auth/auth-shell.component';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './theme/theme.service';
import { IconsComponent } from './shared/icons.component';
import { SidebarComponent, type NavItem, type LearnItem } from './shared/sidebar.component';
import { ProgressBarComponent } from './shared/progress-bar.component';
import { SystemMetricsHeaderComponent } from './system/system-metrics-header.component';
import { UpdateNoticeComponent } from './system/update-notice.component';

@Component({
  selector: 'kiban-root',
  standalone: true,
  imports: [AuthShellComponent, RouterLink, RouterOutlet, SidebarComponent, IconsComponent, ProgressBarComponent, SystemMetricsHeaderComponent, UpdateNoticeComponent],
  template: `
    @if (initializing()) {
      <!-- Loading state -->
      <main class="grid min-h-screen place-items-center surface-base">
        <div class="flex flex-col items-center gap-4">
          <span
            class="h-7 w-7 shrink-0 bg-current"
            style="mask: url(assets/logo.svg) center / contain no-repeat; -webkit-mask: url(assets/logo.svg) center / contain no-repeat;"
            aria-hidden="true"
          ></span>
          <p class="text-sm c-muted animate-pulse">Loading Kiban…</p>
        </div>
      </main>
    } @else if (!auth.isAuthenticated()) {
      <kiban-auth-shell />
    } @else {
      <div class="min-h-screen surface-base">
        <!-- Loading progress bar -->
        <kiban-progress-bar />

        <!-- Sidebar -->
        <kiban-sidebar [navItems]="navItems()" [learnItems]="learnItems()" (collapseChange)="sidebarCollapsed.set($event)" />

        <!-- Main content -->
        <div
          class="flex min-h-screen flex-col transition-all duration-200"
          [style.margin-left]="sidebarCollapsed() ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'"
        >
          <!-- Top header -->
          <header class="sticky top-0 z-sticky flex h-12 items-center justify-between border-b kb-border kb-header px-6">
            <div class="flex items-center gap-3">
              <button
                class="btn-icon md:hidden"
                type="button"
                (click)="mobileMenuOpen.set(!mobileMenuOpen())"
                aria-label="Toggle menu"
              >
                <kiban-icon name="menu" [size]="16" />
              </button>
              <kiban-system-metrics-header />
            </div>
            <div class="flex items-center gap-2">
              <kiban-update-notice />
              <button
                class="btn-icon"
                type="button"
                (click)="theme.toggle()"
                [attr.aria-label]="theme.label()"
                [title]="theme.label()"
              >
                @if (theme.theme() === 'dark') {
                  <kiban-icon name="sun" [size]="15" />
                } @else {
                  <kiban-icon name="moon" [size]="15" />
                }
              </button>
              <a
                routerLink="/profile"
                class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs c-muted hover:c-text hover:bg-hover transition-colors"
              >
                <div class="grid h-5 w-5 place-items-center rounded bg-brand/20 text-[10px] font-medium text-brand-light">
                  {{ (auth.user()?.email ?? '?').charAt(0).toUpperCase() }}
                </div>
                <span class="hidden sm:inline">{{ auth.user()?.email }}</span>
              </a>
              <button
                class="btn-icon"
                type="button"
                (click)="logout()"
                aria-label="Logout"
                title="Logout"
              >
                <kiban-icon name="logout" [size]="15" />
              </button>
            </div>
          </header>

          <!-- Page content -->
          <section class="flex-1 p-6">
            <router-outlet />
          </section>
        </div>
      </div>

      <!-- Mobile sidebar overlay -->
      @if (mobileMenuOpen()) {
        <div
          class="fixed inset-0 z-[450] bg-black/60 md:hidden"
          (click)="mobileMenuOpen.set(false)"
        >
          <div class="h-full w-64 surface-elevated border-r kb-border" (click)="$event.stopPropagation()">
            <kiban-sidebar [navItems]="navItems()" [learnItems]="learnItems()" />
          </div>
        </div>
      }
    }
  `
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly initializing = signal(true);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  protected readonly navItems = signal<readonly NavItem[]>([
    { label: 'Dashboard', path: '/', icon: 'home' },
    { label: 'Projects', path: '/projects', icon: 'projects' },
    { label: 'Catalog', path: '/catalog', icon: 'catalog' },
    { label: 'Installed', path: '/installed', icon: 'installed' },
    { label: 'Users', path: '/users', icon: 'users', adminOnly: true },
    { label: 'Logs', path: '/logs', icon: 'logs' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ]);

  protected readonly learnItems = signal<readonly LearnItem[]>([
    { label: 'Getting Started', path: '/learn/getting-started', icon: 'info' },
    { label: 'Projects & Environments', path: '/learn/projects-environments', icon: 'projects' },
    { label: 'Installing Services', path: '/learn/installing-services', icon: 'installed' },
    { label: 'Domain Routing', path: '/learn/domain-routing', icon: 'server' },
    { label: 'Remote Access', path: '/learn/remote-access', icon: 'external-link' },
  ]);

  public constructor() {
    this.auth.me().subscribe({
      next: () => this.initializing.set(false),
      error: () => this.initializing.set(false)
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe();
  }
}
