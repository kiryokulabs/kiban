import { Injectable } from '@nestjs/common';
import type { PasswordHasher } from '@kiban/core';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt: (password: string, salt: string, keyLength: number, options: ScryptOptions) => Promise<Buffer> = promisify(scryptCallback);
const KEY_LENGTH = 64;
// OWASP's 32 MiB profile limits memory pressure on small local/VPS installations.
const CURRENT_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const LEGACY_OPTIONS = { N: 16384, r: 8, p: 1 };
const HASH_PREFIX = 'scrypt:32768:8:3:';
const DUMMY_SALT = '0'.repeat(32);

@Injectable()
export class NodePasswordHasherService implements PasswordHasher {
  /** Hashes a password with an explicit, versioned scrypt profile and random salt. */
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, KEY_LENGTH, CURRENT_OPTIONS)) as Buffer;
    return `${HASH_PREFIX}${salt}:${key.toString('hex')}`;
  }

  /** Performs the same KDF work for current, legacy, absent and malformed hashes. */
  public async verify(password: string, passwordHash: string | null): Promise<boolean> {
    const current = /^scrypt:32768:8:3:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(passwordHash ?? '');
    const legacy = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(passwordHash ?? '');
    const match = current ?? legacy;
    const salt = match?.[1] ?? DUMMY_SALT;
    // Both profiles run even for a missing account, including during legacy migration.
    const oldKey = (await scrypt(password, salt, KEY_LENGTH, LEGACY_OPTIONS)) as Buffer;
    const newKey = (await scrypt(password, salt, KEY_LENGTH, CURRENT_OPTIONS)) as Buffer;
    const expected = Buffer.from(match?.[2] ?? '0'.repeat(KEY_LENGTH * 2), 'hex');
    const matches = timingSafeEqual(expected, legacy ? oldKey : newKey);
    return match !== null && matches;
  }

  /** Existing installations are upgraded only after successful password verification. */
  public needsRehash(passwordHash: string): boolean {
    return !passwordHash.startsWith(HASH_PREFIX);
  }
}
