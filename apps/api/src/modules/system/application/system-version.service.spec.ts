import { describe, expect, it } from 'vitest';
import { SystemVersionService, type SystemVersionProvider } from './system-version.service';

describe('SystemVersionService', () => {
  it('reports an available update when the latest version is newer', async () => {
    const provider: SystemVersionProvider = {
      getCurrentVersion: () => '0.2.0',
      getLatestVersion: async () => '0.2.1'
    };

    await expect(new SystemVersionService(provider).getVersion()).resolves.toEqual({
      currentVersion: '0.2.0',
      latestVersion: '0.2.1',
      updateAvailable: true,
      checkedAt: expect.any(String)
    });
  });

  it('does not report an update when both versions are equal', async () => {
    const provider: SystemVersionProvider = {
      getCurrentVersion: () => '0.2.0',
      getLatestVersion: async () => 'v0.2.0'
    };

    await expect(new SystemVersionService(provider).getVersion()).resolves.toMatchObject({
      currentVersion: '0.2.0',
      latestVersion: '0.2.0',
      updateAvailable: false
    });
  });

  it('keeps the UI quiet when the latest version cannot be resolved', async () => {
    const provider: SystemVersionProvider = {
      getCurrentVersion: () => '0.2.0',
      getLatestVersion: async () => null
    };

    await expect(new SystemVersionService(provider).getVersion()).resolves.toMatchObject({
      currentVersion: '0.2.0',
      latestVersion: null,
      updateAvailable: false
    });
  });
});
