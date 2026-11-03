import { mkdtempSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SmtpSettingsCipher } from './smtp-settings-cipher';

let directory: string;
let keyPath: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'kiban-smtp-key-')); keyPath = join(directory, 'config', 'smtp.key'); });
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('SMTP credentials at rest', () => {
  it('creates no key until SMTP is saved and uses a persistent restricted key', async () => {
    const cipher = new SmtpSettingsCipher(keyPath);
    expect(existsSync(keyPath)).toBe(false);
    const encrypted = await cipher.encrypt('smtp-secret');
    expect(encrypted).not.toContain('smtp-secret');
    expect(readFileSync(keyPath)).toHaveLength(32);
    expect(statSync(keyPath).mode & 0o777).toBe(0o600);
    expect(await new SmtpSettingsCipher(keyPath).decrypt(encrypted)).toBe('smtp-secret');
    expect(await cipher.encrypt('smtp-secret')).not.toBe(encrypted);
  });

  it('does not silently replace a lost key while decrypting saved settings', async () => {
    const encrypted = await new SmtpSettingsCipher(keyPath).encrypt('smtp-secret');
    unlinkSync(keyPath);
    await expect(new SmtpSettingsCipher(keyPath).decrypt(encrypted)).rejects.toThrow('SMTP');
    expect(existsSync(keyPath)).toBe(false);
  });

  it('rejects corruption or the wrong key', async () => {
    const encrypted = await new SmtpSettingsCipher(keyPath).encrypt('smtp-secret');
    writeFileSync(keyPath, Buffer.alloc(32, 1), { mode: 0o600 });
    await expect(new SmtpSettingsCipher(keyPath).decrypt(encrypted)).rejects.toThrow('SMTP');
    await expect(new SmtpSettingsCipher(keyPath).decrypt('invalid')).rejects.toThrow('SMTP');
  });

  it('creates one complete key even when two backend instances initialize concurrently', async () => {
    const first = new SmtpSettingsCipher(keyPath);
    const second = new SmtpSettingsCipher(keyPath);
    const encrypted = await Promise.all([first.encrypt('first'), second.encrypt('second')]);
    expect(await second.decrypt(encrypted[0]!)).toBe('first');
    expect(await first.decrypt(encrypted[1]!)).toBe('second');
  });
  it('rejects truncated authentication tags instead of accepting weaker ciphertext', async () => {
    const cipher = new SmtpSettingsCipher(keyPath);
    const parts = (await cipher.encrypt('smtp-secret')).split(':');
    parts[2] = Buffer.from(parts[2]!, 'base64url').subarray(0, 4).toString('base64url');
    await expect(cipher.decrypt(parts.join(':'))).rejects.toThrow('SMTP');
  });

  it('can reuse an existing key without requiring writes to its protected directory', async () => {
    const cipher = new SmtpSettingsCipher(keyPath);
    await cipher.encrypt('first');
    chmodSync(join(directory, 'config'), 0o500);
    try {
      expect(await cipher.decrypt(await cipher.encrypt('second'))).toBe('second');
    } finally { chmodSync(join(directory, 'config'), 0o700); }
  });

});
