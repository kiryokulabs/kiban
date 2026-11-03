import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, link, unlink, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SmtpConfigurationError } from '@kiban/core';

/** Encrypts SMTP configuration using a persistent file key, separate from SQLite. */
export class SmtpSettingsCipher {
  public constructor(private readonly keyPath: string) {}

  /** Creates the key lazily only when saving SMTP configuration for the first time. */
  public async encrypt(value: string): Promise<string> {
    try {
      const key = await this.readKey(true);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join(':');
    } catch {
      throw new SmtpConfigurationError('Could not protect SMTP settings. Check the SMTP key file and directory permissions.');
    }
  }

  /** Authenticates ciphertext and never generates a replacement for a lost decryption key. */
  public async decrypt(value: string): Promise<string> {
    try {
      const [version, iv, tag, encrypted, extra] = value.split(':');
      if (version !== 'v1' || !iv || !tag || !encrypted || extra !== undefined) throw new Error('Invalid SMTP ciphertext.');
      const ivBytes = Buffer.from(iv, 'base64url');
      const tagBytes = Buffer.from(tag, 'base64url');
      if (ivBytes.length !== 12 || tagBytes.length !== 16) throw new Error('Invalid SMTP authentication data.');
      const key = await this.readKey(false);
      const decipher = createDecipheriv('aes-256-gcm', key, ivBytes, { authTagLength: 16 });
      decipher.setAuthTag(tagBytes);
      return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new SmtpConfigurationError('Could not unlock SMTP settings. Restore the SMTP key file from your backup.');
    }
  }

  private async readKey(create: boolean): Promise<Buffer> {
    if (create) {
      try { return await this.readKey(false); }
      catch (error: unknown) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
      await mkdir(dirname(this.keyPath), { recursive: true, mode: 0o700 });
      // Link a complete temporary file atomically; concurrent processes share one key.
      const temporary = `${this.keyPath}.${randomUUID()}.tmp`;
      await writeFile(temporary, randomBytes(32), { mode: 0o600, flag: 'wx' });
      try {
        try { await link(temporary, this.keyPath); }
        catch (error: unknown) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error; }
      } finally { await unlink(temporary); }
    }
    const key = await readFile(this.keyPath);
    if (key.length !== 32 || ((await stat(this.keyPath)).mode & 0o077) !== 0) throw new Error('Invalid SMTP key file.');
    return key;
  }
}
