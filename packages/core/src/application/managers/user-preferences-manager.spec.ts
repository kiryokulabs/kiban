import { describe, expect, it } from 'vitest';
import type { UserPreferences, UserTheme } from '../../domain/users/user-preferences.js';
import type { UserPreferencesRepository } from '../interfaces/user-preferences-repository.js';
import { UserPreferencesManager } from './user-preferences-manager.js';

class MemoryUserPreferencesRepository implements UserPreferencesRepository {
  private readonly preferences = new Map<string, UserPreferences>();

  public async findByUserId(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) ?? null;
  }

  public async save(userId: string, theme: UserTheme, updatedAt: Date): Promise<UserPreferences> {
    const preferences = { userId, theme, updatedAt };
    this.preferences.set(userId, preferences);
    return preferences;
  }
}

describe('UserPreferencesManager', () => {
  it('returns the default theme when no preference has been saved', async () => {
    const manager = new UserPreferencesManager(new MemoryUserPreferencesRepository());

    await expect(manager.getTheme('user-1')).resolves.toBe('default');
  });

  it('saves and returns a supported theme', async () => {
    const manager = new UserPreferencesManager(new MemoryUserPreferencesRepository());

    await manager.setTheme('user-1', 'forest-sage');

    await expect(manager.getTheme('user-1')).resolves.toBe('forest-sage');
  });

  it('rejects unsupported themes', async () => {
    const manager = new UserPreferencesManager(new MemoryUserPreferencesRepository());

    await expect(manager.setTheme('user-1', 'unsupported')).rejects.toThrow('Unsupported theme.');
  });
});
