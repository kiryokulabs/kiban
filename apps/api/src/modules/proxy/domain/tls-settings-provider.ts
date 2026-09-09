import type { TlsSettings } from './tls-settings.js';

/** Reads TLS configuration without coupling the proxy to persistence. */
export interface TlsSettingsProvider {
  getTlsSettings(): Promise<TlsSettings>;
}
