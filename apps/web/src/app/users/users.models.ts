export type UserRole = 'admin' | 'operator';
export interface UserListItem { readonly id: string; readonly email: string; readonly role: UserRole; }
export interface CreateOperatorRequest { readonly email: string; readonly password: string; }

/** Safe account login metadata returned by the admin-only activity endpoint. */
export interface UserLoginActivity {
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
