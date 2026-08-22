import { Inject, Injectable, Optional } from '@nestjs/common';
import { SettingsManager } from '@kiban/core';
import { toSettingKey } from '@kiban/shared';
import { SETTINGS_MANAGER } from '../interfaces/settings.constants';
import type { InstanceDomainApplier } from '../interfaces/instance-domain-applier';

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
    await this.manager.setSetting(toSettingKey('instance_domain'), domain);
    if (this.applier) {
      await this.applier.applyInstanceDomain(domain.trim());
    }
  }
}
