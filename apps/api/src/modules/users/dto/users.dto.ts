import type { UserRole, UserTheme } from '@kiban/core';

export interface UserDto { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface CreateOperatorDto { readonly email: string; readonly password: string; }
export interface UserPreferencesDto { readonly theme: UserTheme; }
export interface UpdateUserThemeDto { readonly theme: string; }
