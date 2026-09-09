import type { PublicEndpoint } from '../domain/public-endpoint.js';
import type { TlsPolicy } from '../domain/tls-policy.js';
import type { TlsSettings } from '../domain/tls-settings.js';

/** Translates public endpoints into the installation's proxy configuration. */
export interface ProxyProvider {
  composeYaml(settings: TlsSettings | null): string;
  labelsFor(endpoint: PublicEndpoint, policy: TlsPolicy): Readonly<Record<string, string>>;
}
