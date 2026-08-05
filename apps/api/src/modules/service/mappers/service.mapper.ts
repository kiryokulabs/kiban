import type { AccessPoint, InstalledService } from '@kiban/core';
import type { AccessPointDto, InstalledServiceDto } from '../dto/service.dto';

/** Maps an installed service to its API DTO. */
export const mapInstalledServiceToDto = (service: InstalledService): InstalledServiceDto => {
  const url = firstPublicUrl(service.runtime);
  return {
    id: service.id,
    environmentId: service.environmentId,
    serviceId: service.serviceId,
    name: service.name,
    status: service.status,
    configuration: service.configuration,
    runtime: service.runtime,
    ...(url ? { url } : {}),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString()
  };
};

function firstPublicUrl(runtime: Readonly<Record<string, unknown>> | null): string | undefined {
  const endpoints = runtime?.['publicEndpoints'];
  if (!Array.isArray(endpoints)) return undefined;
  for (const endpoint of endpoints) {
    const record = endpoint && typeof endpoint === 'object' && !Array.isArray(endpoint) ? endpoint as Readonly<Record<string, unknown>> : null;
    const url = record?.['url'];
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return undefined;
}

/** Builds a generic connection string from the access point kind. */
function buildConnectionString(
  kind: string,
  host: string,
  port: number,
  username?: string,
  password?: string,
  database?: string
): string | undefined {
  if (kind === 'web') return undefined;

  const auth = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const dbPath = database ? `/${database}` : '';
  return `${kind}://${auth}${host}:${port}${dbPath}`;
}

/**
 * Resolves credential values from configuration using the env-var names stored
 * in the access point connection block.
 */
function extractCredentials(
  accessPoint: AccessPoint,
  configuration: Readonly<Record<string, unknown>>
): { readonly username?: string; readonly password?: string; readonly database?: string } {
  const conn = accessPoint.connection;
  if (conn === undefined) return {};

  const resolve = (envVarName: string | undefined): string | undefined => {
    if (envVarName === undefined) return undefined;
    const val = configuration[envVarName];
    return typeof val === 'string' && val ? val : undefined;
  };

  const username = resolve(conn.username);
  const password = resolve(conn.password);
  const database = resolve(conn.database);

  return {
    ...(username !== undefined ? { username } : {}),
    ...(password !== undefined ? { password } : {}),
    ...(database !== undefined ? { database } : {})
  };
}

/**
 * Finds the assigned host port for a specific compose service and container port.
 *
 * Supports the current multi-container runtime shape (`containers` array) and the
 * legacy single-container shape (`assignedPorts` at the runtime root) for services
 * installed before the multi-container migration.
 */
function findHostPort(
  serviceName: string,
  port: number,
  runtime: Readonly<Record<string, unknown>>
): number | undefined {
  const containers = runtime['containers'];

  // New format: runtime.containers[].assignedPorts
  if (Array.isArray(containers)) {
    for (const container of containers) {
      if (!container || typeof container !== 'object' || Array.isArray(container)) continue;
      const c = container as Readonly<Record<string, unknown>>;
      if (c['name'] !== serviceName) continue;
      const assignedPorts = c['assignedPorts'];
      if (!Array.isArray(assignedPorts)) continue;
      for (const ap of assignedPorts) {
        if (!ap || typeof ap !== 'object' || Array.isArray(ap)) continue;
        const entry = ap as Readonly<Record<string, unknown>>;
        const cp = entry['containerPort'];
        if (typeof cp === 'string') {
          const portNum = parseInt(cp.split('/')[0] ?? '0', 10);
          if (portNum === port) {
            const hp = entry['hostPort'];
            if (typeof hp === 'string' && hp) return Number(hp);
          }
        }
      }
    }
    return undefined;
  }

  // Legacy format: runtime.assignedPorts (no service-name discrimination)
  const assignedPorts = runtime['assignedPorts'];
  if (!Array.isArray(assignedPorts)) return undefined;
  for (const ap of assignedPorts) {
    if (!ap || typeof ap !== 'object' || Array.isArray(ap)) continue;
    const entry = ap as Readonly<Record<string, unknown>>;
    const cp = entry['containerPort'];
    if (typeof cp === 'string') {
      const portNum = parseInt(cp.split('/')[0] ?? '0', 10);
      if (portNum === port) {
        const hp = entry['hostPort'];
        if (typeof hp === 'string' && hp) return Number(hp);
      }
    }
  }
  return undefined;
}

function findPublicEndpoint(
  serviceName: string,
  port: number,
  runtime: Readonly<Record<string, unknown>>
): { readonly host: string; readonly url: string } | undefined {
  const endpoints = runtime['publicEndpoints'];
  if (!Array.isArray(endpoints)) return undefined;
  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) continue;
    const record = endpoint as Readonly<Record<string, unknown>>;
    if (record['service'] !== serviceName || Number(record['port']) !== port) continue;
    const host = record['host'];
    const url = record['url'];
    if (typeof host === 'string' && typeof url === 'string') return { host, url };
  }
  return undefined;
}

/**
 * Computes enriched access point DTOs from a ServiceDefinition's access point list,
 * the installed service's configuration, and its current runtime state.
 *
 * Returns `undefined` when no access point has enough information to be useful
 * (no assigned host port and no resolved credentials).
 */
export function computeAccessPoints(
  accessPoints: readonly AccessPoint[],
  configuration: Readonly<Record<string, unknown>>,
  runtime: Readonly<Record<string, unknown>> | null
): readonly AccessPointDto[] | undefined {
  if (accessPoints.length === 0) return undefined;

  const host = 'localhost';
  const result: AccessPointDto[] = [];

  for (const ap of accessPoints) {
    const hostPort = runtime !== null ? findHostPort(ap.service, ap.port, runtime) : undefined;
    const publicEndpoint = runtime !== null ? findPublicEndpoint(ap.service, ap.port, runtime) : undefined;
    const credentials = extractCredentials(ap, configuration);
    const hasUsefulInfo =
      hostPort !== undefined ||
      publicEndpoint !== undefined ||
      credentials.username !== undefined ||
      credentials.password !== undefined;

    if (!hasUsefulInfo) continue;

    const connectionString =
      ap.kind !== 'web' && hostPort !== undefined
        ? buildConnectionString(ap.kind, host, hostPort, credentials.username, credentials.password, credentials.database)
        : undefined;

    result.push({
      name: ap.name,
      kind: ap.kind,
      port: ap.port,
      ...(hostPort !== undefined ? { hostPort } : {}),
      host: publicEndpoint?.host ?? host,
      ...(publicEndpoint !== undefined ? { url: publicEndpoint.url } : {}),
      ...(credentials.username !== undefined ? { username: credentials.username } : {}),
      ...(credentials.password !== undefined ? { password: credentials.password } : {}),
      ...(credentials.database !== undefined ? { database: credentials.database } : {}),
      ...(connectionString !== undefined ? { connectionString } : {})
    });
  }

  return result.length > 0 ? result : undefined;
}
