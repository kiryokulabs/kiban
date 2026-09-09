import type { ProxyProvider } from '../../application/proxy-provider.js';
import type { PublicEndpoint } from '../../domain/public-endpoint.js';
import type { TlsPolicy } from '../../domain/tls-policy.js';
import type { TlsSettings } from '../../domain/tls-settings.js';
import { TraefikComposeFactory } from './traefik-compose.factory.js';
import { TraefikLabelsFactory } from './traefik-labels.factory.js';

/** Traefik adapter for Kiban's shared proxy contract. */
export class TraefikProxyProvider implements ProxyProvider {
  public constructor(
    private readonly composeFactory = new TraefikComposeFactory(),
    private readonly labelsFactory = new TraefikLabelsFactory()
  ) {}

  public composeYaml(settings: TlsSettings | null): string {
    return this.composeFactory.create({
      networkName: 'kiban',
      acmeEmail: settings?.acmeEmail ?? process.env['KIBAN_ACME_EMAIL'] ?? 'admin@kiban.local',
      acmeStoragePath: '/traefik/acme.json',
      useStaging: settings?.useStaging ?? process.env['KIBAN_ACME_STAGING'] === 'true'
    });
  }

  public labelsFor(endpoint: PublicEndpoint, policy: TlsPolicy): Readonly<Record<string, string>> {
    return this.labelsFactory.create(endpoint, policy);
  }
}
