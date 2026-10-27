import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';
export type ColorTheme = 'default' | 'iron-copper' | 'obsidian-vermilion' | 'midnight-indigo' | 'forest-sage' | 'forged-brass' | 'titanium-ice' | 'arctic-cyan' | 'volcanic-amber' | 'plum-orchid' | 'moss-lime';

export const COLOR_THEMES: readonly { readonly id: ColorTheme; readonly name: string }[] = [
  { id: 'default', name: 'Default' },
  { id: 'iron-copper', name: 'Iron Copper' },
  { id: 'obsidian-vermilion', name: 'Obsidian Vermilion' },
  { id: 'midnight-indigo', name: 'Midnight Indigo' },
  { id: 'forest-sage', name: 'Forest Sage' },
  { id: 'forged-brass', name: 'Forged Brass' },
  { id: 'titanium-ice', name: 'Titanium Ice' },
  { id: 'arctic-cyan', name: 'Arctic Cyan' },
  { id: 'volcanic-amber', name: 'Volcanic Amber' },
  { id: 'plum-orchid', name: 'Plum Orchid' },
  { id: 'moss-lime', name: 'Moss Lime' }
];

const THEME_COOKIE_NAME = 'kiban_theme';
const COLOR_THEME_COOKIE_NAME = 'kiban_color_theme'; // Avoid glitch to default theme during first render
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mode = signal<ThemeMode>(this.readThemeCookie() ?? 'dark');
  private readonly selectedColorTheme = signal<ColorTheme>(this.readColorThemeCookie() ?? 'default');

  public readonly theme = this.mode.asReadonly();
  public readonly colorTheme = this.selectedColorTheme.asReadonly();
  public readonly label = computed(() => (this.mode() === 'dark' ? 'Light mode' : 'Dark mode'));

  public constructor() {
    this.applyTheme(this.mode());
    this.applyColorTheme(this.selectedColorTheme());
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

  /** Applies and caches the selected color theme. */
  public setColorTheme(theme: ColorTheme): void {
    this.selectedColorTheme.set(theme);
    this.applyColorTheme(theme);
    this.writeColorThemeCookie(theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.dataset['theme'] = theme;
  }

  private applyColorTheme(theme: ColorTheme): void {
    document.documentElement.dataset['colorTheme'] = theme;
  }

  private readThemeCookie(): ThemeMode | null {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${THEME_COOKIE_NAME}=`));
    const value = cookie?.split('=')[1];
    return value === 'light' || value === 'dark' ? value : null;
  }

  private writeThemeCookie(theme: ThemeMode): void {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }

  private readColorThemeCookie(): ColorTheme | null {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${COLOR_THEME_COOKIE_NAME}=`));
    const value = cookie?.split('=')[1];
    return COLOR_THEMES.some((theme) => theme.id === value) ? value as ColorTheme : null;
  }

  private writeColorThemeCookie(theme: ColorTheme): void {
    document.cookie = `${COLOR_THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}
