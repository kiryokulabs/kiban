import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export type SmtpSecurity = 'tls' | 'starttls' | 'none';
export interface SmtpSettingsInput {
  readonly host: string;
  readonly port: number;
  readonly security: SmtpSecurity;
  readonly username: string;
  readonly password?: string;
  readonly fromName: string;
  readonly fromEmail: string;
}
export interface SmtpSettingsView extends Omit<SmtpSettingsInput, 'password'> { readonly hasPassword: boolean; }

/** Dedicated SMTP client; it never calls domain, routing or proxy settings endpoints. */
@Injectable({ providedIn: 'root' })
export class SmtpSettingsApiService {
  public constructor(private readonly http: HttpClient) {}
  public get(): Observable<SmtpSettingsView | null> { return this.http.get<SmtpSettingsView | null>('/api/notifications/smtp', { withCredentials: true }); }
  public save(settings: SmtpSettingsInput): Observable<SmtpSettingsView> { return this.http.put<SmtpSettingsView>('/api/notifications/smtp', settings, { withCredentials: true }); }
  public sendTest(): Observable<void> { return this.http.post<void>('/api/notifications/smtp/test', {}, { withCredentials: true }); }
}
