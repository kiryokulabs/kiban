import type { UserRole } from '@kiban/core';

export interface UserDto { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface CreateOperatorDto { readonly email: string; readonly password: string; }
