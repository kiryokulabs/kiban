/**
 * ServiceDefinition — the frozen, merged description of a catalog service.
 *
 * Produced by the Catalog Loader from the four required files
 * (compose.yml, metadata.json, schema.json, icon.svg). It is the only view of
 * a service that business logic may consume:
 *
 * - `runtime` — deployment facts, derived from compose.yml (a RuntimeSpec)
 * - `metadata` — presentation facts, from metadata.json (a strict whitelist)
 *
 * metadata.json is a strict whitelist: keys outside ServiceMetadata are invalid
 * and the Catalog Loader rejects the service.
 */

import type { RuntimeSpec } from './runtime-spec.js';

/**
 * The connection block of an access point. Every value is the NAME of an
 * environment variable declared in compose.yml — never a real value. The
 * runtime resolves the references when it generates connection strings.
 */
export interface AccessPointConnection {
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
}

/**
 * A network access point a service exposes to users.
 *
 * - `service` references a compose service name (validated at load time)
 * - `kind` is an open string (web, postgres, mysql, redis, ...). Known kinds
 *   let the runtime generate connection strings; unknown kinds render host:port.
 */
export interface AccessPoint {
  readonly name: string;
  readonly kind: string;
  readonly service: string;
  readonly port: number;
  readonly connection?: AccessPointConnection;
}

/**
 * The metadata.json whitelist. Presentation-only: deployment facts (image,
 * ports, volumes, environment) live in compose.yml and reach the rest of the
 * system through RuntimeSpec.
 */
export interface ServiceMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly author: string;
  readonly minimumVersion: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly documentation?: string;
  readonly website?: string;
  readonly license?: string;
  readonly featured?: boolean;
  readonly accessPoints: readonly AccessPoint[];
}

/** The merged, immutable description of one catalog service. */
export interface ServiceDefinition {
  readonly id: string;
  readonly metadata: ServiceMetadata;
  /** Raw compose.yml content — the deployment source of truth. */
  readonly composeYaml: string;
  /** Normalized deployment description derived from compose.yml. */
  readonly runtime: RuntimeSpec;
  /** Config UI schema (schema.json). */
  readonly schema: Readonly<Record<string, unknown>>;
  /** Raw icon.svg content. */
  readonly icon: string;
  /** Absolute path to the service folder. */
  readonly sourcePath: string;
}
