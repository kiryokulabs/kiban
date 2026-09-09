import type { TlsSettings } from '../../proxy/domain/tls-settings';

/** Applies shared proxy TLS settings to the runtime. */
export interface TlsSettingsApplier {
  applyTlsSettings(settings: TlsSettings): Promise<boolean>;
}
