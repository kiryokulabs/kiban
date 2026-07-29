import { Injectable } from '@nestjs/common';
import type { PasswordHasher } from '@kiban/core';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

@Injectable()
export class NodePasswordHasherService implements PasswordHasher {
  /** Hashes a password using Node's scrypt primitive and a per-password salt. */
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  /** Verifies a password against the stored scrypt hash. */
  public async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, expectedHash] = passwordHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !expectedHash) {
      return false;
    }

    const expected = Buffer.from(expectedHash, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
