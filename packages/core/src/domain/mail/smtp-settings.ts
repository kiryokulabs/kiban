/** SMTP transport security, independent of dashboard/service HTTPS configuration. */
export type SmtpSecurity = 'tls' | 'starttls' | 'none';

/** Private backend settings; never serialize this type as an HTTP response. */
export interface SmtpSettings {
  readonly host: string;
  readonly port: number;
  readonly security: SmtpSecurity;
  readonly username: string;
  readonly password: string | null;
  readonly fromName: string;
  readonly fromEmail: string;
}

/** Safe settings returned to authenticated users without the saved password. */
export interface SmtpSettingsView {
  readonly host: string;
  readonly port: number;
  readonly security: SmtpSecurity;
  readonly username: string;
  readonly hasPassword: boolean;
  readonly fromName: string;
  readonly fromEmail: string;
}

export class SmtpValidationError extends Error {}
export class SmtpConfigurationError extends Error {}
export class SmtpDeliveryError extends Error {}
