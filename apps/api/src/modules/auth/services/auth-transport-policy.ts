import { Injectable } from '@nestjs/common';
import { toSettingKey } from '@kiban/shared';
import { isIP } from 'node:net';
import { SqliteSettingsRepository } from '../../settings/repositories/sqlite-settings.repository';

/** Restricts browser terminal handshakes to the actual Kiban installation origin. */
@Injectable()
export class AuthTransportPolicy {
  public constructor(private readonly settings: SqliteSettingsRepository) {}

  /** Allows exact local/IP installation origins or the persisted HTTPS instance domain. */
  public async allowsOrigin(origin: string | undefined, host: string | undefined, protocol: string): Promise<boolean> {
    if (!origin || !host) return false;
    let url: URL;
    try { url = new URL(origin); } catch { return false; }
    if (url.origin !== origin || url.host !== host || url.protocol !== `${protocol}:` || !['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || isIP(hostname)) return true;
    const domain = await this.settings.get(toSettingKey('instance_domain'));
    return protocol === 'https' && hostname === domain?.value;
  }
}
