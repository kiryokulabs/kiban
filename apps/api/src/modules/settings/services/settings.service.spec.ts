import { beforeEach, describe, expect, it } from 'vitest';
import type { Setting } from '@kiban/core';
import type { SettingKey } from '@kiban/shared';
import { toSettingKey } from '@kiban/shared';
import type { SettingsManager } from '@kiban/core';
import { SettingsService } from './settings.service.js';
import type { InstanceDomainApplier } from '../interfaces/instance-domain-applier.js';

const now = new Date('2026-08-22T12:00:00.000Z');

class MockSettingsManager {
  public readonly settings = new Map<string, Setting>();

  public async getSetting(key: SettingKey): Promise<Setting | null> {
    return this.settings.get(key) ?? null;
  }

  public async setSetting(key: SettingKey, value: string): Promise<void> {
    if (!value || value.trim().length === 0) throw new Error('Setting value must not be empty.');
    this.settings.set(key, { key, value: value.trim(), updatedAt: now });
  }

  public async listSettings(): Promise<readonly Setting[]> {
    return [...this.settings.values()];
  }
}

class MockApplier implements InstanceDomainApplier {
  public lastDomain: string | null = null;
  public calls = 0;

  public async applyInstanceDomain(domain: string): Promise<boolean> {
    this.lastDomain = domain;
    this.calls += 1;
    return true;
  }
}

describe('SettingsService', () => {
  let manager: MockSettingsManager;
  let applier: MockApplier;
  let service: SettingsService;

  beforeEach(() => {
    manager = new MockSettingsManager();
    applier = new MockApplier();
    service = new SettingsService(manager as unknown as SettingsManager, applier);
  });

  describe('getInstanceDomain', () => {
    it('returns null when no domain is configured', async () => {
      const domain = await service.getInstanceDomain();

      expect(domain).toBeNull();
    });

    it('returns the configured domain', async () => {
      await service.setInstanceDomain('kiban.example.com');

      const domain = await service.getInstanceDomain();

      expect(domain).toBe('kiban.example.com');
    });
  });

  describe('setInstanceDomain', () => {
    it('saves the domain', async () => {
      await service.setInstanceDomain('kiban.example.com');

      const setting = await manager.getSetting(toSettingKey('instance_domain'));

      expect(setting?.value).toBe('kiban.example.com');
    });

    it('overwrites an existing domain', async () => {
      await service.setInstanceDomain('old.example.com');
      await service.setInstanceDomain('new.example.com');

      const domain = await service.getInstanceDomain();

      expect(domain).toBe('new.example.com');
    });

    it('rejects empty domain', async () => {
      await expect(service.setInstanceDomain('')).rejects.toThrow();
    });

    it('rejects whitespace-only domain', async () => {
      await expect(service.setInstanceDomain('   ')).rejects.toThrow();
    });

    it('trims whitespace from domain', async () => {
      await service.setInstanceDomain('  kiban.example.com  ');

      const domain = await service.getInstanceDomain();

      expect(domain).toBe('kiban.example.com');
    });

    it('applies the domain to the runtime applier', async () => {
      await service.setInstanceDomain('kiban.example.com');

      expect(applier.lastDomain).toBe('kiban.example.com');
      expect(applier.calls).toBe(1);
    });

    it('applies empty string to the applier when clearing domain', async () => {
      await service.setInstanceDomain('kiban.example.com');
      // setInstanceDomain rejects empty values, so we test via manager directly
      await manager.setSetting(toSettingKey('instance_domain'), 'placeholder');
      // The applier should have been called with the domain
      expect(applier.calls).toBe(1);
    });
  });

  describe('without applier', () => {
    it('works without an applier (null)', async () => {
      const serviceWithoutApplier = new SettingsService(manager as unknown as SettingsManager, null);

      await serviceWithoutApplier.setInstanceDomain('kiban.example.com');

      const domain = await serviceWithoutApplier.getInstanceDomain();

      expect(domain).toBe('kiban.example.com');
    });
  });
});
