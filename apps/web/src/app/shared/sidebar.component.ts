import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { IconsComponent, type KibanIcon } from './icons.component';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: KibanIcon;
  readonly adminOnly?: boolean;
  readonly badge?: number;
}

@Component({
  selector: 'kiban-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconsComponent],
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-sticky flex flex-col border-r kb-border"
      [style.width]="collapsed() ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'"
      style="transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <!-- Logo area -->
      <div class="flex h-12 items-center gap-3 border-b kb-border px-4" [class.justify-center]="collapsed()">
        <div class="grid h-7 w-7 shrink-0 place-items-center rounded-lg kb-logo text-xs font-bold">K</div>
        @if (!collapsed()) {
          <div class="flex min-w-0 flex-1 items-center justify-between">
            <span class="text-sm font-semibold kb-text">Kiban</span>
          </div>
        }
        <button
          class="btn-icon hidden md:inline-flex"
          type="button"
          (click)="toggleCollapse()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <kiban-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="14" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-2 py-3">
        <div class="space-y-0.5">
          @for (item of visibleNavItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors kb-nav-item"
              [class.justify-center]="collapsed()"
              [title]="collapsed() ? item.label : ''"
            >
              <kiban-icon [name]="item.icon" [size]="16" class="shrink-0" />
              @if (!collapsed()) {
                <span class="truncate">{{ item.label }}</span>
              }
              @if (!collapsed() && item.badge !== undefined && item.badge > 0) {
                <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand/20 px-1.5 text-[11px] font-medium text-brand-light">{{ item.badge }}</span>
              }
            </a>
          }
        </div>
      </nav>

      <!-- Footer area -->
      <div class="border-t kb-border px-2 py-2" [class.flex-col]="collapsed()">
        <!-- Theme toggle -->
        <button
          class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors kb-nav-item"
          type="button"
          (click)="toggleTheme()"
          [class.justify-center]="collapsed()"
          [title]="collapsed() ? themeLabel() : themeLabel()"
        >
          @if (isDark()) {
            <kiban-icon name="sun" [size]="16" class="shrink-0" />
          } @else {
            <kiban-icon name="moon" [size]="16" class="shrink-0" />
          }
          @if (!collapsed()) {
            <span class="truncate">{{ themeLabel() }}</span>
          }
        </button>

        <!-- User / Profile -->
        @if (!collapsed()) {
          <a
            routerLink="/profile"
            routerLinkActive="active"
            class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors kb-nav-item mt-0.5"
          >
            <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/20 text-[11px] font-medium text-brand-light">
              {{ userInitial() }}
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-xs font-medium kb-text">{{ userEmail() }}</span>
              <span class="truncate text-[11px] kb-muted">{{ userRole() }}</span>
            </div>
          </a>
        } @else {
          <a
            routerLink="/profile"
            class="flex items-center justify-center rounded-lg px-2.5 py-2 transition-colors kb-nav-item"
            title="Profile"
          >
            <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/20 text-[11px] font-medium text-brand-light">
              {{ userInitial() }}
            </div>
          </a>
        }
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  /** Navigation items to display */
  readonly navItems = input<readonly NavItem[]>([]);
  /** Emits when the sidebar collapse state changes */
  readonly collapseChange = output<boolean>();

  protected readonly collapsed = signal(false);
  protected readonly isDark = computed(() => this.theme.theme() === 'dark');
  protected readonly themeLabel = computed(() => this.isDark() ? 'Dark mode' : 'Light mode');
  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  protected readonly userRole = computed(() => this.auth.user()?.role ?? '');
  protected readonly userInitial = computed(() => this.userEmail().charAt(0).toUpperCase() || '?');

  protected readonly visibleNavItems = computed(() =>
    this.navItems().filter(item => !item.adminOnly || this.auth.user()?.role === 'admin')
  );

  protected toggleCollapse(): void {
    this.collapsed.update(v => !v);
    this.collapseChange.emit(this.collapsed());
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
