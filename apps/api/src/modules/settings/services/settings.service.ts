import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { SettingsManager } from '@kiban/core';
import { toSettingKey } from '@kiban/shared';
import { SETTINGS_MANAGER } from '../interfaces/settings.constants';
import type { InstanceDomainApplier } from '../interfaces/instance-domain-applier';
import type { TraefikInfo } from '../../service/providers/docker-compose-runtime.provider';

/** Application service for reading and writing Kiban settings. */
@Injectable()
export class SettingsService {
  public constructor(
    @Inject(SETTINGS_MANAGER) private readonly manager: SettingsManager,
    @Optional() @Inject('INSTANCE_DOMAIN_APPLIER') private readonly applier: InstanceDomainApplier | null
  ) {}

  /** Returns the configured instance domain, or null when not set. */
  public async getInstanceDomain(): Promise<string | null> {
    const setting = await this.manager.getSetting(toSettingKey('instance_domain'));
    return setting?.value ?? null;
  }

  /** Saves the instance domain and applies Traefik routing when available. */
  public async setInstanceDomain(domain: string): Promise<void> {
    const normalized = this.normalizeOptionalHostname(domain, 'Instance domain');
    if (normalized === null) {
      if (this.applier) await this.applier.applyInstanceDomain('');
      await this.manager.clearSetting(toSettingKey('instance_domain'));
      return;
    }

    if (this.applier) await this.applier.applyInstanceDomain(normalized);
    await this.manager.setSetting(toSettingKey('instance_domain'), normalized);
  }

  /** Returns Traefik reverse proxy information and active routers. */
  public async getTraefikInfo(): Promise<TraefikInfo> {
    if (!this.applier) {
      return { status: 'not-installed', version: null, ports: [], entrypoints: [], dockerNetwork: null, dashboard: false, routers: [] };
    }
    return this.applier.getTraefikInfo();
  }

  /** Returns the configured wildcard domain for service URLs, or null when not set. */
  public async getWildcardDomain(): Promise<string | null> {
    const setting = await this.manager.getSetting(toSettingKey('wildcard_domain'));
    return setting?.value ?? null;
  }

  /** Saves the wildcard domain used to generate service URLs. */
  public async setWildcardDomain(domain: string): Promise<void> {
    const normalized = this.normalizeOptionalHostname(domain, 'Wildcard domain');
    if (normalized === null) {
      await this.manager.clearSetting(toSettingKey('wildcard_domain'));
      return;
    }
    await this.manager.setSetting(toSettingKey('wildcard_domain'), normalized);
  }

  private normalizeOptionalHostname(value: string, label: 'Instance domain' | 'Wildcard domain'): string | null {
    const hostname = value.trim().toLowerCase();
    if (hostname.length === 0) return null;

    if (hostname.includes('://') || hostname.includes('/') || hostname.includes(':') || hostname.includes('*')) {
      throw new BadRequestException(`${label} must be a hostname without protocol, wildcard, port, or path.`);
    }

    if (hostname.length > 253 || /\s/.test(hostname) || hostname.startsWith('.') || hostname.endsWith('.')) {
      throw new BadRequestException(`${label} must be a valid hostname.`);
    }

    const labels = hostname.split('.');
    const valid = labels.every((part) => part.length > 0 && part.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part));
    if (!valid) throw new BadRequestException(`${label} must be a valid hostname.`);

    return hostname;
  }

  /** Returns the installation type: 'local' or 'remote'. Defaults to 'local'. */
  public async getInstallationType(): Promise<'local' | 'remote'> {
    const setting = await this.manager.getSetting(toSettingKey('installation_type'));
    return setting?.value === 'remote' ? 'remote' : 'local';
  }

  /** Saves the installation type. */
  public async setInstallationType(type: 'local' | 'remote'): Promise<void> {
    await this.manager.setSetting(toSettingKey('installation_type'), type);
  }
}
