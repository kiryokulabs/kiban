import type { PublicUser } from '../../domain/users/user.js';
import { ForbiddenUserActionError } from '../../domain/users/user-errors.js';
import { SmtpValidationError, type SmtpSettings, type SmtpSettingsView } from '../../domain/mail/smtp-settings.js';
import type { SmtpSender, SmtpSettingsRepository } from '../interfaces/smtp-settings.js';

/** Provides authenticated SMTP reads and administrator-only configuration and test delivery. */
export class SmtpSettingsManager {
  public constructor(private readonly settings: SmtpSettingsRepository, private readonly sender: SmtpSender) {}

  /** Reads configuration without exposing a saved password. */
  public async get(_actor: PublicUser): Promise<SmtpSettingsView | null> {
    const settings = await this.settings.get();
    return settings ? this.toView(settings) : null;
  }

  /** Validates a complete configuration, preserving an omitted/blank existing password. */
  public async save(actor: PublicUser, payload: unknown): Promise<SmtpSettingsView> {
    this.assertAdmin(actor);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SmtpValidationError('Invalid SMTP settings.');
    const fields = payload as Readonly<Record<string, unknown>>;
    const allowed = ['host', 'port', 'security', 'username', 'password', 'fromName', 'fromEmail'];
    if (Object.keys(fields).some((key) => !allowed.includes(key)) || ['host', 'username', 'fromName', 'fromEmail'].some((key) => typeof fields[key] !== 'string')) {
      throw new SmtpValidationError('Invalid SMTP settings.');
    }
    const host = String(fields['host']).trim().toLowerCase();
    const username = String(fields['username']).trim();
    const fromName = String(fields['fromName']).trim();
    const fromEmail = String(fields['fromEmail']).trim();
    const port = fields['port'];
    const security = fields['security'];
    const password = fields['password'];
    const validHost = host.includes(':') ? /^(?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}$/i.test(host)
      : host.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    if (!host || host.length > 253 || !validHost) throw new SmtpValidationError('SMTP host must be a hostname or IP address, without protocol or path.');
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) throw new SmtpValidationError('SMTP port must be an integer from 1 to 65535.');
    if (security !== 'tls' && security !== 'starttls' && security !== 'none') throw new SmtpValidationError('Choose TLS, STARTTLS or an unencrypted local relay.');
    if (username.length > 320 || /[\r\n]/.test(username)) throw new SmtpValidationError('Invalid SMTP username.');
    if (fromName.length > 100 || /[\r\n]/.test(fromName)) throw new SmtpValidationError('Invalid sender name.');
    if (!this.validEmail(fromEmail)) throw new SmtpValidationError('A valid sender email is required.');
    if (password !== undefined && (typeof password !== 'string' || new TextEncoder().encode(password).length > 4096)) throw new SmtpValidationError('Invalid SMTP password.');
    if (security === 'none' && username) throw new SmtpValidationError('SMTP authentication requires TLS or STARTTLS.');
    if (!username && password) throw new SmtpValidationError('An SMTP username is required when providing a password.');
    const previous = username && !password ? await this.settings.get() : null;
    const savedPassword = !username ? null : password || (previous?.username === username ? previous.password : null);
    if (username && !savedPassword) throw new SmtpValidationError('An SMTP password is required for this username.');
    const settings: SmtpSettings = { host, port, security, username, password: savedPassword, fromName, fromEmail };
    await this.settings.save(settings);
    return this.toView(settings);
  }

  /** Sends only to the authenticated administrator, never a caller-selected recipient. */
  public async sendTest(actor: PublicUser): Promise<void> {
    this.assertAdmin(actor);
    const settings = await this.settings.get();
    if (!settings) throw new SmtpValidationError('Save SMTP settings before sending a test email.');
    if (!this.validEmail(actor.email)) throw new SmtpValidationError('The administrator must have a valid email address.');
    await this.sender.send(settings, { to: actor.email, subject: 'Kiban SMTP test', text: 'This is a test email from Kiban. Your saved SMTP settings were used to send this message.' });
  }

  private assertAdmin(actor: PublicUser): void {
    if (actor.role !== 'admin') throw new ForbiddenUserActionError();
  }

  private validEmail(email: string): boolean {
    return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(email);
  }

  private toView(settings: SmtpSettings): SmtpSettingsView {
    return { host: settings.host, port: settings.port, security: settings.security, username: settings.username, fromName: settings.fromName, fromEmail: settings.fromEmail, hasPassword: settings.password !== null };
  }
}
