import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const THEME_COOKIE_NAME = 'kiban_theme';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mode = signal<ThemeMode>(this.readThemeCookie() ?? 'dark');

  public readonly theme = this.mode.asReadonly();
  public readonly label = computed(() => (this.mode() === 'dark' ? 'Light mode' : 'Dark mode'));

  public constructor() {
    this.applyTheme(this.mode());
  }

  /** Toggles between light and dark theme and persists the choice in a cookie. */
  public toggle(): void {
    this.setTheme(this.mode() === 'dark' ? 'light' : 'dark');
  }

  /** Applies and persists the requested theme. */
  public setTheme(theme: ThemeMode): void {
    this.mode.set(theme);
    this.applyTheme(theme);
    this.writeThemeCookie(theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.dataset['theme'] = theme;
  }

  private readThemeCookie(): ThemeMode | null {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${THEME_COOKIE_NAME}=`));
    const value = cookie?.split('=')[1];
    return value === 'light' || value === 'dark' ? value : null;
  }

  private writeThemeCookie(theme: ThemeMode): void {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}
