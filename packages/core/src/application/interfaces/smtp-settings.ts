import type { SmtpSettings } from '../../domain/mail/smtp-settings.js';

/** Persists private SMTP settings behind infrastructure-managed encryption. */
export interface SmtpSettingsRepository {
  get(): Promise<SmtpSettings | null>;
  save(settings: SmtpSettings): Promise<void>;
}

/** Application-owned text mail; deliberately independent of any notification trigger. */
export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Sends outgoing email without exposing transport credentials to callers or the UI. */
export interface SmtpSender {
  send(settings: SmtpSettings, message: MailMessage): Promise<void>;
}
