import { beforeEach, describe, expect, it } from 'vitest';
import type { Setting } from '@kiban/core';
import type { SettingKey } from '@kiban/shared';
import { toSettingKey } from '@kiban/shared';
import type { SettingsManager } from '@kiban/core';
import { SettingsService } from './settings.service.js';
import type { InstanceDomainApplier } from '../interfaces/instance-domain-applier.js';
import type { TlsSettingsApplier } from '../interfaces/tls-settings-applier.js';
import type { TlsSettings } from '../../proxy/domain/tls-settings.js';
import type { TraefikInfo } from '../../service/providers/docker-compose-runtime.provider.js';

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

  public async clearSetting(key: SettingKey): Promise<void> {
    this.settings.delete(key);
  }
}

class MockTlsApplier implements TlsSettingsApplier {
  public lastSettings: TlsSettings | null = null;
  public calls = 0;
  public shouldThrow = false;

  public async applyTlsSettings(settings: TlsSettings): Promise<boolean> {
    if (this.shouldThrow) throw new Error('proxy refresh failed');
    this.lastSettings = settings;
    this.calls += 1;
    return true;
  }
}

class MockApplier implements InstanceDomainApplier {
  public shouldThrow = false;
  public lastDomain: string | null = null;
  public calls = 0;
  public traefikInfo: TraefikInfo = {
    status: 'running',
    version: 'traefik:v3.6',
    ports: [{ published: 80, target: 80 }, { published: 443, target: 443 }],
    entrypoints: [{ name: 'web', address: ':80' }, { name: 'websecure', address: ':443' }],
    dockerNetwork: 'kiban',
    dashboard: false,
    routers: []
  };

  public async applyInstanceDomain(domain: string): Promise<boolean> {
    if (this.shouldThrow) throw new Error('runtime failed');
    this.lastDomain = domain;
    this.calls += 1;
    return true;
  }

  public async getTraefikInfo(): Promise<TraefikInfo> {
    return this.traefikInfo;
  }
}

describe('SettingsService', () => {
  let manager: MockSettingsManager;
  let applier: MockApplier;
  let service: SettingsService;
  let tlsApplier: MockTlsApplier;

  beforeEach(() => {
    manager = new MockSettingsManager();
    applier = new MockApplier();
    tlsApplier = new MockTlsApplier();
    service = new SettingsService(manager as unknown as SettingsManager, applier, tlsApplier);
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

    it('clears empty domain and removes runtime routing', async () => {
      await service.setInstanceDomain('kiban.example.com');

      await service.setInstanceDomain('');

      expect(await service.getInstanceDomain()).toBeNull();
      expect(applier.lastDomain).toBe('');
    });

    it('clears whitespace-only domain and removes runtime routing', async () => {
      await service.setInstanceDomain('kiban.example.com');

      await service.setInstanceDomain('   ');

      expect(await service.getInstanceDomain()).toBeNull();
      expect(applier.lastDomain).toBe('');
    });

    it('rejects invalid instance domain hostnames', async () => {
      await expect(service.setInstanceDomain('https://kiban.example.com')).rejects.toThrow('Instance domain must be a hostname without protocol, wildcard, port, or path.');
      await expect(service.setInstanceDomain('kiban.example.com/path')).rejects.toThrow('Instance domain must be a hostname without protocol, wildcard, port, or path.');
      await expect(service.setInstanceDomain('kiban example.com')).rejects.toThrow('Instance domain must be a valid hostname.');
      await expect(service.setInstanceDomain('*.example.com')).rejects.toThrow('Instance domain must be a hostname without protocol, wildcard, port, or path.');
    });

    it('does not persist instance domain when runtime application fails', async () => {
      applier.shouldThrow = true;

      await expect(service.setInstanceDomain('kiban.example.com')).rejects.toThrow('runtime failed');

      expect(await service.getInstanceDomain()).toBeNull();
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

    it('allows localhost instance domains', async () => {
      await service.setInstanceDomain('kiban.localhost');

      expect(await service.getInstanceDomain()).toBe('kiban.localhost');
    });
  });

  describe('without applier', () => {
    it('works without an applier (null)', async () => {
      const serviceWithoutApplier = new SettingsService(manager as unknown as SettingsManager, null);

      await serviceWithoutApplier.setInstanceDomain('kiban.example.com');

      const domain = await serviceWithoutApplier.getInstanceDomain();

      expect(domain).toBe('kiban.example.com');
    });

    it('returns not-installed traefik info without an applier', async () => {
      const serviceWithoutApplier = new SettingsService(manager as unknown as SettingsManager, null);

      const info = await serviceWithoutApplier.getTraefikInfo();

      expect(info.status).toBe('not-installed');
      expect(info.routers).toEqual([]);
    });
  });

  describe('getTraefikInfo', () => {
    it('returns traefik info from the applier', async () => {
      const info = await service.getTraefikInfo();

      expect(info.status).toBe('running');
      expect(info.version).toBe('traefik:v3.6');
      expect(info.ports).toEqual([{ published: 80, target: 80 }, { published: 443, target: 443 }]);
    });

    it('returns routers from the applier', async () => {
      applier.traefikInfo = {
        ...applier.traefikInfo,
        routers: [{
          name: 'kiban-web',
          rule: 'Host(`kiban.example.com`)',
          entrypoint: 'web',
          service: 'kiban-web',
          port: '80',
          container: 'kiban-kiban-web-1'
        }]
      };

      const info = await service.getTraefikInfo();

      expect(info.routers).toHaveLength(1);
      expect(info.routers[0]?.name).toBe('kiban-web');
    });
  });

  describe('getWildcardDomain', () => {
    it('returns null when no wildcard domain is configured', async () => {
      const domain = await service.getWildcardDomain();

      expect(domain).toBeNull();
    });

    it('returns the configured wildcard domain', async () => {
      await service.setWildcardDomain('apps.example.com');

      const domain = await service.getWildcardDomain();

      expect(domain).toBe('apps.example.com');
    });
  });

  describe('setWildcardDomain', () => {
    it('saves the wildcard domain', async () => {
      await service.setWildcardDomain('apps.example.com');

      const setting = await manager.getSetting(toSettingKey('wildcard_domain'));

      expect(setting?.value).toBe('apps.example.com');
    });

    it('overwrites an existing wildcard domain', async () => {
      await service.setWildcardDomain('old.example.com');
      await service.setWildcardDomain('new.example.com');

      const domain = await service.getWildcardDomain();

      expect(domain).toBe('new.example.com');
    });

    it('clears empty wildcard domain', async () => {
      await service.setWildcardDomain('apps.example.com');

      await service.setWildcardDomain('');

      expect(await service.getWildcardDomain()).toBeNull();
    });

    it('clears whitespace-only wildcard domain', async () => {
      await service.setWildcardDomain('apps.example.com');

      await service.setWildcardDomain('   ');

      expect(await service.getWildcardDomain()).toBeNull();
    });

    it('rejects invalid wildcard domain hostnames', async () => {
      await expect(service.setWildcardDomain('https://apps.example.com')).rejects.toThrow('Wildcard domain must be a hostname without protocol, wildcard, port, or path.');
      await expect(service.setWildcardDomain('*.apps.example.com')).rejects.toThrow('Wildcard domain must be a hostname without protocol, wildcard, port, or path.');
      await expect(service.setWildcardDomain('apps.example.com/path')).rejects.toThrow('Wildcard domain must be a hostname without protocol, wildcard, port, or path.');
    });

    it('trims whitespace from wildcard domain', async () => {
      await service.setWildcardDomain('  apps.example.com  ');

      const domain = await service.getWildcardDomain();

      expect(domain).toBe('apps.example.com');
    });
  });

  describe('TLS settings', () => {
    it('returns safe defaults when TLS settings are not configured', async () => {
      await expect(service.getTlsSettings()).resolves.toEqual({ acmeEmail: null, useStaging: false });
    });

    it('persists a normalized ACME email and staging flag', async () => {
      await service.setTlsSettings({ acmeEmail: '  ops@example.com ', useStaging: true });

      await expect(service.getTlsSettings()).resolves.toEqual({ acmeEmail: 'ops@example.com', useStaging: true });
    });

    it('clears the ACME email when omitted and preserves the staging flag', async () => {
      await service.setTlsSettings({ acmeEmail: 'ops@example.com', useStaging: true });
      await service.setTlsSettings({ acmeEmail: null, useStaging: true });

      await expect(service.getTlsSettings()).resolves.toEqual({ acmeEmail: null, useStaging: true });
    });

    it('rejects invalid ACME emails', async () => {
      await expect(service.setTlsSettings({ acmeEmail: 'not-an-email', useStaging: false })).rejects.toThrow('ACME email must be valid.');
      await expect(service.setTlsSettings({ acmeEmail: 'ops@example.com/path', useStaging: false })).rejects.toThrow('ACME email must be valid.');
    });

    it('applies normalized TLS settings before persisting them', async () => {
      await service.setTlsSettings({ acmeEmail: '  SECURITY@example.com ', useStaging: true });

      expect(tlsApplier.lastSettings).toEqual({ acmeEmail: 'security@example.com', useStaging: true });
      expect(tlsApplier.calls).toBe(1);
    });

    it('does not persist TLS settings when proxy refresh fails', async () => {
      tlsApplier.shouldThrow = true;

      await expect(service.setTlsSettings({ acmeEmail: 'ops@example.com', useStaging: false })).rejects.toThrow('proxy refresh failed');

      await expect(service.getTlsSettings()).resolves.toEqual({ acmeEmail: null, useStaging: false });
    });

  });
});
