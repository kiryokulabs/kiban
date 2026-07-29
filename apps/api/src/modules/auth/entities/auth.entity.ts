import type { UserRole } from '@kiban/core';

export interface AuthUserEntity { readonly id: string; readonly email: string; readonly role: UserRole; }
