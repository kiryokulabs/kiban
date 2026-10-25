import { isUserTheme, type UserTheme } from '../../domain/users/user-preferences.js';
import type { UserPreferencesRepository } from '../interfaces/user-preferences-repository.js';

/** Coordinates authenticated user preference use cases. */
export class UserPreferencesManager {
  public constructor(private readonly preferences: UserPreferencesRepository) {}

  /** Returns the saved theme or the default theme. */
  public async getTheme(userId: string): Promise<UserTheme> {
    return (await this.preferences.findByUserId(userId))?.theme ?? 'default';
  }

  /** Validates and saves a user's theme. */
  public async setTheme(userId: string, theme: string): Promise<void> {
    if (!isUserTheme(theme)) {
      throw new Error('Unsupported theme.');
    }
    await this.preferences.save(userId, theme, new Date());
  }
}
