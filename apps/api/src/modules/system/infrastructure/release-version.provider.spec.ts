import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReleaseVersionProvider } from './release-version.provider';

const originalFetch = globalThis.fetch;

describe('ReleaseVersionProvider', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('reads the current version from the runtime environment when process env is absent', () => {
    vi.stubEnv('KIBAN_VERSION', undefined);
    const root = mkdtempSync(join(tmpdir(), 'kiban-version-'));
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, '.env'), 'KIBAN_VERSION=0.2.0\n', 'utf8');

    try {
      expect(new ReleaseVersionProvider(root).getCurrentVersion()).toBe('0.2.0');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns the latest version from the configured release endpoint', async () => {
    globalThis.fetch = vi.fn(async () => new Response('v0.2.1\n')) as typeof fetch;

    await expect(new ReleaseVersionProvider('/missing', 'https://updates.example.test/VERSION').getLatestVersion()).resolves.toBe('v0.2.1');
  });

  it('returns null when the release endpoint cannot be reached', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network unavailable'); }) as typeof fetch;

    await expect(new ReleaseVersionProvider('/missing').getLatestVersion()).resolves.toBeNull();
  });
});
