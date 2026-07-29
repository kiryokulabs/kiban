import type { UserRole } from '@kiban/core';

export interface BootstrapStatusDto { readonly requiresAdminSetup: boolean; }
export interface RegisterAdminDto { readonly email: string; readonly password: string; }
export interface LoginDto { readonly email: string; readonly password: string; }
export interface AuthUserDto { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface AuthResponseDto { readonly user: AuthUserDto; }
export interface ChangePasswordDto { readonly currentPassword: string; readonly newPassword: string; }
