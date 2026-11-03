import { SmtpConfigurationError, type SmtpSettings, type SmtpSettingsRepository, type SettingsRepository } from '@kiban/core';
import { toSettingKey } from '@kiban/shared';
import { SmtpSettingsCipher } from './smtp-settings-cipher';

const SMTP_KEY = toSettingKey('smtp');

/** Stores only an encrypted SMTP record; never reads or updates routing settings. */
export class EncryptedSmtpSettingsRepository implements SmtpSettingsRepository {
  public constructor(private readonly settings: SettingsRepository, private readonly cipher: SmtpSettingsCipher) {}

  public async get(): Promise<SmtpSettings | null> {
    const setting = await this.settings.get(SMTP_KEY);
    if (!setting) return null;
    const decrypted = await this.cipher.decrypt(setting.value);
    try { return JSON.parse(decrypted) as SmtpSettings; }
    catch { throw new SmtpConfigurationError('Saved SMTP settings could not be read.'); }
  }

  public async save(settings: SmtpSettings): Promise<void> {
    const value = await this.cipher.encrypt(JSON.stringify(settings));
    await this.settings.set({ key: SMTP_KEY, value, updatedAt: new Date() });
  }
}
