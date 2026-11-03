import type { SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SmtpDeliveryError, type MailMessage, type SmtpSender, type SmtpSettings } from '@kiban/core';

interface SmtpTransport {
  sendMail(message: SendMailOptions): Promise<{ readonly accepted: readonly unknown[] }>;
  close(): void;
}

/** Infrastructure SMTP adapter. Its TLS settings never affect Kiban/Traefik HTTPS. */
export class NodemailerSmtpSender implements SmtpSender {
  public constructor(private readonly createTransport: (options: SMTPTransport.Options) => SmtpTransport) {}

  public async send(settings: SmtpSettings, message: MailMessage): Promise<void> {
    const transport = this.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.security === 'tls',
      requireTLS: settings.security === 'starttls',
      ignoreTLS: settings.security === 'none',
      ...(settings.username && settings.security !== 'none' ? { auth: { user: settings.username, pass: settings.password ?? '' } } : {}),
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      dnsTimeout: 10_000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true
    });
    try {
      const result = await transport.sendMail({ from: { name: settings.fromName, address: settings.fromEmail }, to: message.to, subject: message.subject, text: message.text });
      if (result.accepted.length === 0) throw new SmtpDeliveryError('The SMTP server did not accept the email.');
    } catch (error: unknown) {
      if (error instanceof SmtpDeliveryError) throw error;
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (code === 'EAUTH') throw new SmtpDeliveryError('SMTP authentication failed. Check the saved username and password.');
      throw new SmtpDeliveryError('Could not send the email. Check the SMTP host, port, security mode and sender permissions.');
    } finally { transport.close(); }
  }
}
