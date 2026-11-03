import { describe, expect, it, vi } from 'vitest';
import { toSettingKey } from '@kiban/shared';
import { AuthTransportPolicy } from './auth-transport-policy';
import type { SqliteSettingsRepository } from '../../settings/repositories/sqlite-settings.repository';

const createPolicy = (domain: string | null = null) => {
  const settings: Pick<SqliteSettingsRepository, 'get'> = { get: vi.fn(async () => domain ? { value: domain, key: toSettingKey('instance_domain'), updatedAt: new Date() } : null) };
  return new AuthTransportPolicy(settings as SqliteSettingsRepository);
};

describe('Terminal browser origin policy', () => {
  it.each(['http://localhost:8080', 'http://127.0.0.1:4200', 'http://[::1]:8080', 'http://192.0.2.1:8080'])('allows the installation address %s', async (origin) => {
    expect(await createPolicy().allowsOrigin(origin, new URL(origin).host, 'http')).toBe(true);
  });
  it('allows the exact persisted HTTPS instance domain', async () => {
    expect(await createPolicy('kiban.example.com').allowsOrigin('https://kiban.example.com', 'kiban.example.com', 'https')).toBe(true);
  });
  it.each([
    ['https://evil.example', 'localhost:8080', 'http'],
    ['http://redis.localhost:8080', 'localhost:8080', 'http'],
    ['http://evil.example', 'evil.example', 'http'],
    ['http://localhost:3000', 'localhost:8080', 'http'],
    ['http://localhost:8080', 'localhost:8080', 'https'],
    ['null', 'localhost:8080', 'http'],
    [undefined, 'localhost:8080', 'http']
  ])('rejects untrusted, sibling, mismatched and opaque origins', async (origin, host, protocol) => {
    expect(await createPolicy().allowsOrigin(origin, host, protocol)).toBe(false);
  });
});
