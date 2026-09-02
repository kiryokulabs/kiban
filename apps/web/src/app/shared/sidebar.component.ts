import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { IconsComponent, type KibanIcon } from './icons.component';
import { SidebarLayoutPresenter, type SidebarDisplayMode } from './sidebar-layout.presenter';
import { SystemMetricsHeaderComponent } from '../system/system-metrics-header.component';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: KibanIcon;
  readonly adminOnly?: boolean;
  readonly badge?: number;
}

export interface LearnItem {
  readonly label: string;
  readonly path: string;
  readonly icon: KibanIcon;
}

@Component({
  selector: 'kiban-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconsComponent, SystemMetricsHeaderComponent],
  template: `
    <aside
      [class]="layout.asideClass(displayMode())"
      [style.width]="layout.width(displayMode(), collapsed())"
      style="transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <!-- Logo area -->
      <div class="flex h-12 items-center gap-3 border-b kb-border px-4" [class.justify-center]="collapsed()">
        <span
          class="h-7 w-7 shrink-0 bg-current"
          style="mask: url(assets/logo.svg) center / contain no-repeat; -webkit-mask: url(assets/logo.svg) center / contain no-repeat;"
          aria-hidden="true"
        ></span>
        @if (!collapsed()) {
          <div class="flex min-w-0 flex-1 items-center justify-between">
            <span class="text-sm font-semibold kb-text">KibanOS</span>
            <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-danger">beta</span>
          </div>
        }
        @if (layout.canCollapse(displayMode())) {
          <button
            class="btn-icon hidden md:inline-flex"
            type="button"
            (click)="toggleCollapse()"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <kiban-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="14" />
          </button>
        }
      </div>

      @if (displayMode() === 'mobile') {
        <div class="border-b kb-border px-3 py-3">
          <kiban-system-metrics-header [compact]="true" />
        </div>
      }

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

        <!-- Learn section -->
        @if (!collapsed() && learnItems().length > 0) {
          <div class="mt-4">
            <button
              class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider c-subtle transition-colors hover:c-muted"
              type="button"
              (click)="learnExpanded.set(!learnExpanded())"
            >
              <kiban-icon [name]="learnExpanded() ? 'chevron-down' : 'chevron-right'" [size]="12" class="shrink-0" />
              <span>Onboarding</span>
            </button>
            @if (learnExpanded()) {
              <div class="mt-1 space-y-0.5">
                @for (item of learnItems(); track item.path) {
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors kb-nav-item"
                  >
                    <kiban-icon [name]="item.icon" [size]="16" class="shrink-0" />
                    <span class="truncate">{{ item.label }}</span>
                  </a>
                }
              </div>
            }
          </div>
        }
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
  /** Learn items to display in the collapsible section */
  readonly learnItems = input<readonly LearnItem[]>([]);
  /** Controls whether the sidebar is rendered as the persistent desktop rail or the mobile drawer content. */
  readonly displayMode = input<SidebarDisplayMode>('desktop');
  /** Emits when the sidebar collapse state changes */
  readonly collapseChange = output<boolean>();

  protected readonly layout = new SidebarLayoutPresenter();
  protected readonly collapsed = signal(false);
  protected readonly learnExpanded = signal(false);
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
