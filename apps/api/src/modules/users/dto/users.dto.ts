import type { UserRole, UserTheme } from '@kiban/core';

export interface UserDto { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface CreateOperatorDto { readonly email: string; readonly password: string; }
export interface UserPreferencesDto { readonly theme: UserTheme; }
export interface UpdateUserThemeDto { readonly theme: string; }

/** Admin-only login metadata; never contains session identifiers or credentials. */
export interface UserLoginActivityDto {
  readonly userId: string;
  readonly lastLoginAt: string | null;
  readonly lastLoginIp: string | null;
  readonly activeSessions: number;
  readonly currentSession: {
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly ipAddress: string | null;
  } | null;
}
