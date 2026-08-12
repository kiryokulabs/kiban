export interface KibanRuntimeDomainConfig {
  readonly development: string;
  readonly staging: string;
  readonly production: string;
  readonly [environment: string]: string;
}

export interface KibanRuntimeConfig {
  readonly protocol: 'http' | 'https';
  readonly domains: KibanRuntimeDomainConfig;
}

export const defaultKibanRuntimeConfig: KibanRuntimeConfig = {
  protocol: 'http',
  domains: {
    development: 'localhost',
    staging: 'localhost',
    production: 'localhost'
  }
};

/** Builds runtime configuration from process environment with safe local defaults. */
export function createKibanRuntimeConfig(env: NodeJS.ProcessEnv = process.env): KibanRuntimeConfig {
  const defaultDomain = env['KIBAN_DOMAIN_DEFAULT'];
  return {
    protocol: env['KIBAN_DOMAIN_PROTOCOL'] === 'https' ? 'https' : 'http',
    domains: {
      development: env['KIBAN_DOMAIN_DEVELOPMENT'] ?? defaultDomain ?? defaultKibanRuntimeConfig.domains.development,
      staging: env['KIBAN_DOMAIN_STAGING'] ?? defaultDomain ?? defaultKibanRuntimeConfig.domains.staging,
      production: env['KIBAN_DOMAIN_PRODUCTION'] ?? defaultDomain ?? defaultKibanRuntimeConfig.domains.production
    }
  };
}
