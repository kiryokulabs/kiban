import { describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '../../domain/users/user.js';
import { ForbiddenUserActionError } from '../../domain/users/user-errors.js';
import type { SmtpSettings } from '../../domain/mail/smtp-settings.js';
import type { SmtpSettingsRepository, SmtpSender } from '../interfaces/smtp-settings.js';
import { SmtpValidationError } from '../../domain/mail/smtp-settings.js';
import { SmtpSettingsManager } from './smtp-settings-manager.js';

const admin: PublicUser = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
const operator: PublicUser = { ...admin, id: 'operator-1', role: 'operator' };
const input = { host: 'smtp.example.com', port: 587, security: 'starttls', username: 'smtp-user', password: ' secret-password ', fromName: 'Kiban', fromEmail: 'kiban@example.com' };

const createManager = () => {
  let settings: SmtpSettings | null = null;
  const repository: SmtpSettingsRepository = { get: vi.fn(async () => settings), save: vi.fn(async (value) => { settings = value; }) };
  const sender: SmtpSender = { send: vi.fn(async () => undefined) };
  return { manager: new SmtpSettingsManager(repository, sender), repository, sender, stored: () => settings };
};

describe('SMTP settings', () => {
  it('starts unconfigured without creating or sending anything', async () => {
    const { manager, repository, sender } = createManager();
    expect(await manager.get(admin)).toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('saves settings but never returns the saved password', async () => {
    const { manager, stored } = createManager();
    const view = await manager.save(admin, input);
    expect(view).toEqual({ host: input.host, port: 587, security: 'starttls', username: 'smtp-user', fromName: 'Kiban', fromEmail: input.fromEmail, hasPassword: true });
    expect(stored()?.password).toBe(' secret-password ');
    expect(JSON.stringify(await manager.get(admin))).not.toContain('secret-password');
  });

  it('preserves a saved password when the password field is left blank or omitted', async () => {
    const { manager, stored } = createManager();
    await manager.save(admin, input);
    const { password: _password, ...withoutPassword } = input;
    await manager.save(admin, { ...withoutPassword, fromName: 'My Kiban' });
    expect(stored()?.password).toBe(input.password);
    await manager.save(admin, { ...withoutPassword, password: '' });
    expect(stored()?.password).toBe(input.password);
  });

  it('allows an explicitly unauthenticated local relay and clears old credentials', async () => {
    const { manager, stored } = createManager();
    await manager.save(admin, input);
    await manager.save(admin, { ...input, host: 'localhost', port: 1025, security: 'none', username: '', password: '' });
    expect(stored()?.password).toBeNull();
    expect((await manager.get(admin))?.hasPassword).toBe(false);
  });

  it('does not reuse a password when changing the authentication username', async () => {
    const { manager } = createManager();
    await manager.save(admin, input);
    await expect(manager.save(admin, { ...input, username: 'another-user', password: '' })).rejects.toBeInstanceOf(SmtpValidationError);
  });

  it('sends the test only to the authenticated administrator using saved settings', async () => {
    const { manager, sender, stored } = createManager();
    await manager.save(admin, input);
    await manager.sendTest(admin);
    expect(sender.send).toHaveBeenCalledWith(stored(), { to: admin.email, subject: 'Kiban SMTP test', text: expect.any(String) });
  });

  it('rejects test sending before configuration', async () => {
    const { manager, sender } = createManager();
    await expect(manager.sendTest(admin)).rejects.toBeInstanceOf(SmtpValidationError);
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('allows operators to read configured settings without exposing passwords', async () => {
    const { manager } = createManager();
    expect(await manager.get(operator)).toBeNull();
    await manager.save(admin, input);
    const view = await manager.get(operator);
    expect(view?.host).toBe(input.host);
    expect(view?.hasPassword).toBe(true);
    expect(view).not.toHaveProperty('password');
    expect(JSON.stringify(view)).not.toContain(input.password);
  });

  it('checks admin permission before writing or sending', async () => {
    const { manager, repository, sender } = createManager();
    await expect(manager.save(operator, input)).rejects.toBeInstanceOf(ForbiddenUserActionError);
    await expect(manager.sendTest(operator)).rejects.toBeInstanceOf(ForbiddenUserActionError);
    expect(repository.get).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { ...input, host: 'https://smtp.example.com' }, { ...input, host: 'host\r\ninjected' }, { ...input, host: 'a'.repeat(254) }, { ...input, port: '587' }, { ...input, port: 0 }, { ...input, port: 65536 }, { ...input, port: 1.5 }, { ...input, security: 'automatic' }, { ...input, security: 'none' }, { ...input, fromEmail: 'invalid' }, { ...input, fromEmail: 'one,two@example.com' }, { ...input, fromEmail: 'user@-invalid.com' }, { ...input, fromEmail: 'a@b.com\r\nBcc: victim@example.com' }, { ...input, fromName: 'name\r\nInjected' }, { ...input, password: 123 }, { ...input, recipient: 'victim@example.com' }, { ...input, tls: { rejectUnauthorized: false } }])('rejects invalid or extra settings without saving', async (payload) => {
    const { manager, repository } = createManager();
    await expect(manager.save(admin, payload)).rejects.toBeInstanceOf(SmtpValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects administrator addresses that could be interpreted as a recipient list', async () => {
    const { manager, sender } = createManager();
    await manager.save(admin, input);
    await expect(manager.sendTest({ ...admin, email: 'one,two@example.com' })).rejects.toBeInstanceOf(SmtpValidationError);
    expect(sender.send).not.toHaveBeenCalled();
  });

});
