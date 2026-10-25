export const USER_THEMES = [
  'default',
  'iron-copper',
  'obsidian-vermilion',
  'midnight-indigo',
  'forest-sage',
  'forged-brass',
  'titanium-ice',
  'arctic-cyan',
  'volcanic-amber',
  'plum-orchid',
  'moss-lime'] as const;

export type UserTheme = typeof USER_THEMES[number];

export interface UserPreferences {
  readonly userId: string;
  readonly theme: UserTheme;
  readonly updatedAt: Date;
}

export const isUserTheme = (value: string): value is UserTheme => USER_THEMES.some((theme) => theme === value);
