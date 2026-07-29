import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import type { AuthResponse, AuthUser, BootstrapStatus, ChangePasswordRequest, Credentials } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000';
  private readonly currentUser = signal<AuthUser | null>(null);

  public constructor(private readonly http: HttpClient) {}

  public readonly user = this.currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Checks if this installation still needs the first admin account. */
  public bootstrapStatus(): Observable<BootstrapStatus> {
    return this.http.get<BootstrapStatus>(`${this.apiUrl}/auth/bootstrap-status`, { withCredentials: true });
  }

  /** Creates the initial admin account while bootstrap registration is open. */
  public registerAdmin(credentials: Credentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register-admin`, credentials, { withCredentials: true }).pipe(switchMap(() => this.login(credentials)));
  }

  /** Logs in and lets the API write the httpOnly session cookie. */
  public login(credentials: Credentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true }).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  /** Reads the current authenticated user from the API session cookie. */
  public me(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`, { withCredentials: true }).pipe(tap((response) => this.currentUser.set(response.user)));
  }


  /** Changes the current password and clears local auth state after the API revokes the session. */
  public changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, request, { withCredentials: true }).pipe(tap(() => this.currentUser.set(null)));
  }

  /** Revokes the current session cookie. */
  public logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(tap(() => this.currentUser.set(null)));
  }
}
