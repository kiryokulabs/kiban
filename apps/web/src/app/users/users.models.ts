export type UserRole = 'admin' | 'operator';
export interface UserListItem { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface CreateOperatorRequest { readonly email: string; readonly password: string; }
