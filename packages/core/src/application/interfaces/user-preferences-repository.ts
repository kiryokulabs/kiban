import type { UserPreferences, UserTheme } from '../../domain/users/user-preferences.js';

export interface UserPreferencesRepository {
  /** Finds preferences belonging to a user. */
  findByUserId(userId: string): Promise<UserPreferences | null>;
  /** Creates or updates a user's theme preference. */
  save(userId: string, theme: UserTheme, updatedAt: Date): Promise<UserPreferences>;
}
