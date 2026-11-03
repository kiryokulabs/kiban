import { scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NodePasswordHasherService } from './node-password-hasher.service';

const hasher = new NodePasswordHasherService();

describe('Password hashing compatibility and security', () => {
  it('stores explicit OWASP scrypt parameters, unique salts and no plaintext', async () => {
    const first = await hasher.hash('correct-password');
    const second = await hasher.hash('correct-password');
    expect(first).toMatch(/^scrypt:32768:8:3:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain('correct-password');
    expect(await hasher.verify('correct-password', first)).toBe(true);
    expect(await hasher.verify('wrong-password', first)).toBe(false);
    expect(hasher.needsRehash(first)).toBe(false);
  });

  it('verifies existing hashes so upgrades do not lock out installed users', async () => {
    const salt = 'a'.repeat(32);
    const legacy = `scrypt:${salt}:${scryptSync('old-password', salt, 64).toString('hex')}`;
    expect(await hasher.verify('old-password', legacy)).toBe(true);
    expect(await hasher.verify('wrong-password', legacy)).toBe(false);
    expect(hasher.needsRehash(legacy)).toBe(true);
  });

  it.each([null, '', 'scrypt:bad:bad', `scrypt:999999999:8:3:${'a'.repeat(32)}:${'0'.repeat(128)}`])('rejects missing or malformed hashes without trusting embedded cost parameters', async (hash) => {
    expect(await hasher.verify('some-password', hash)).toBe(false);
  });
});
