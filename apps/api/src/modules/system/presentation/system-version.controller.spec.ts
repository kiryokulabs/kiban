import { describe, expect, it } from 'vitest';
import { SystemVersionController } from './system-version.controller';
import { SystemVersionService, type SystemVersionInfo } from '../application/system-version.service';

describe('SystemVersionController', () => {
  it('exposes Kiban version information', async () => {
    const version: SystemVersionInfo = {
      currentVersion: '0.2.0',
      latestVersion: '0.2.1',
      updateAvailable: true,
      checkedAt: '2026-08-25T00:00:00.000Z'
    };
    const service = new SystemVersionService({ getCurrentVersion: () => version.currentVersion, getLatestVersion: async () => version.latestVersion });
    const controller = new SystemVersionController(service);

    await expect(controller.getVersion()).resolves.toMatchObject({
      currentVersion: '0.2.0',
      latestVersion: '0.2.1',
      updateAvailable: true
    });
  });
});
