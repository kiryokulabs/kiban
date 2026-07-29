export interface BootstrapStatus { readonly requiresAdminSetup: boolean; }
export interface AuthUser { readonly id: string; readonly email: string; readonly role: 'admin'; }
export interface AuthResponse { readonly user: AuthUser; }
export interface Credentials { readonly email: string; readonly password: string; }
export interface ChangePasswordRequest { readonly currentPassword: string; readonly newPassword: string; }
