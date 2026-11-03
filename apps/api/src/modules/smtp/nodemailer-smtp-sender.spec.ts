import { describe, expect, it, vi } from 'vitest';
import type { SmtpSettings } from '@kiban/core';
import { NodemailerSmtpSender } from './nodemailer-smtp-sender';

const message = { to: 'admin@example.com', subject: 'Kiban SMTP test', text: 'SMTP delivery test.' };

const settings: SmtpSettings = { host: 'smtp.example.com', port: 587, security: 'starttls', username: 'smtp-user', password: 'private-password', fromName: 'Kiban', fromEmail: 'kiban@example.com' };

describe('SMTP transport security', () => {
  it('delivers application-owned content so SMTP is not tied to test emails', async () => {
    const sendMail = vi.fn(async () => ({ accepted: ['user@example.com'] }));
    const sender = new NodemailerSmtpSender(() => ({ sendMail, close: vi.fn() }));
    await sender.send(settings, { to: 'user@example.com', subject: 'Application message', text: 'Application-owned body.' });
    expect(sendMail).toHaveBeenCalledWith({ from: { name: 'Kiban', address: settings.fromEmail }, to: 'user@example.com', subject: 'Application message', text: 'Application-owned body.' });
  });

  it.each(['starttls', 'tls', 'none'] as const)('uses the explicitly chosen %s transport without weakening certificate checks', async (security) => {
    const sendMail = vi.fn(async () => ({ accepted: ['admin@example.com'] }));
    const close = vi.fn();
    const factory = vi.fn(() => ({ sendMail, close }));
    const sender = new NodemailerSmtpSender(factory);
    await sender.send({ ...settings, security, ...(security === 'none' ? { username: '', password: null } : {}) }, message);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ secure: security === 'tls', requireTLS: security === 'starttls', ignoreTLS: security === 'none', tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, logger: false, debug: false }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.com', from: { name: 'Kiban', address: settings.fromEmail } }));
    expect(JSON.stringify(sendMail.mock.calls)).not.toContain('private-password');
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not leak SMTP server errors or credentials to the API', async () => {
    const close = vi.fn();
    const sender = new NodemailerSmtpSender(() => ({ sendMail: vi.fn(async () => { throw Object.assign(new Error('private-password token user credentials'), { code: 'EAUTH' }); }), close }));
    await expect(sender.send(settings, message)).rejects.toThrow('SMTP authentication failed');
    await expect(sender.send(settings, message)).rejects.not.toThrow('private-password');
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('does not claim success when the SMTP server accepted no recipients', async () => {
    const sender = new NodemailerSmtpSender(() => ({ sendMail: vi.fn(async () => ({ accepted: [] })), close: vi.fn() }));
    await expect(sender.send(settings, message)).rejects.toThrow('accept');
  });
});
