import { describe, expect, it } from 'vitest';
import type { AccessPoint } from '@kiban/core';
import { computeAccessPoints } from './service.mapper';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const pgAccessPoint: AccessPoint = {
  name: 'Database',
  kind: 'postgres',
  service: 'postgresql',
  port: 5432,
  connection: { username: 'POSTGRES_USER', password: 'POSTGRES_PASSWORD', database: 'POSTGRES_DB' }
};

const webAccessPoint: AccessPoint = {
  name: 'Web UI',
  kind: 'web',
  service: 'app',
  port: 8080
};

/** Multi-container runtime (new format) */
const newRuntime = (serviceName: string, containerPort: number, hostPort: string): Readonly<Record<string, unknown>> => ({
  provider: 'docker',
  containers: [{
    name: serviceName,
    id: 'container-1',
    assignedPorts: [{ containerPort: `${containerPort}/tcp`, hostIp: '0.0.0.0', hostPort }]
  }],
  networkId: 'net-1',
  volumeIds: [],
  health: 'healthy',
  status: 'running',
  createdAt: '2026-07-30T10:00:00.000Z'
});

/** Old single-container runtime (backward-compat format) */
const oldRuntime = (containerPort: string, hostPort: string): Readonly<Record<string, unknown>> => ({
  provider: 'docker',
  containerId: 'container-1',
  assignedPorts: [{ containerPort, hostIp: '0.0.0.0', hostPort }],
  networkIds: ['net-1'],
  health: 'healthy',
  status: 'running'
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('computeAccessPoints', () => {
  it('returns undefined when accessPoints array is empty', () => {
    expect(computeAccessPoints([], {}, null)).toBeUndefined();
  });

  it('returns undefined when runtime is null and no credentials are available', () => {
    expect(computeAccessPoints([webAccessPoint], {}, null)).toBeUndefined();
  });

  it('returns undefined when runtime is null and credentials are missing from configuration', () => {
    expect(computeAccessPoints([pgAccessPoint], {}, null)).toBeUndefined();
  });

  it('finds the host port from a multi-container runtime by service name', () => {
    const runtime = newRuntime('postgresql', 5432, '49153');
    const config = { POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass', POSTGRES_DB: 'mydb' };
    const result = computeAccessPoints([pgAccessPoint], config, runtime);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ name: 'Database', kind: 'postgres', hostPort: 49153 });
  });

  it('builds a generic connection string from the access point kind', () => {
    const runtime = newRuntime('postgresql', 5432, '49153');
    const config = { POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass', POSTGRES_DB: 'mydb' };
    const result = computeAccessPoints([pgAccessPoint], config, runtime);
    expect(result![0]!.connectionString).toBe('postgres://user:pass@localhost:49153/mydb');
  });

  it('produces no connection string for the web kind', () => {
    const runtime = newRuntime('app', 8080, '32100');
    const result = computeAccessPoints([webAccessPoint], {}, runtime);
    expect(result).toHaveLength(1);
    expect(result![0]!.connectionString).toBeUndefined();
    expect(result![0]!.hostPort).toBe(32100);
  });

  it('uses runtime public endpoint URLs for proxied web access points', () => {
    const runtime = {
      ...newRuntime('app', 8080, '32100'),
      publicEndpoints: [{ name: 'Web UI', service: 'app', port: 8080, host: 'app.crossmetrics.localhost', url: 'http://app.crossmetrics.localhost' }]
    };

    const result = computeAccessPoints([webAccessPoint], {}, runtime);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ host: 'app.crossmetrics.localhost', url: 'http://app.crossmetrics.localhost' });
  });

  it('resolves credentials from configuration using the env-var names in connection', () => {
    const runtime = newRuntime('postgresql', 5432, '49153');
    const config = { POSTGRES_USER: 'alice', POSTGRES_PASSWORD: 'hunter2', POSTGRES_DB: 'prod' };
    const result = computeAccessPoints([pgAccessPoint], config, runtime);
    expect(result![0]).toMatchObject({ username: 'alice', password: 'hunter2', database: 'prod' });
  });

  it('builds a generic connection string without auth', () => {
    const redisAp: AccessPoint = { name: 'Cache', kind: 'redis', service: 'redis', port: 6379 };
    const runtime = newRuntime('redis', 6379, '32768');
    const result = computeAccessPoints([redisAp], {}, runtime);
    expect(result).toHaveLength(1);
    expect(result![0]!.connectionString).toBe('redis://localhost:32768');
  });

  it('builds a generic mysql connection string from the kind', () => {
    const mysqlAp: AccessPoint = {
      name: 'DB', kind: 'mysql', service: 'mysql', port: 3306,
      connection: { username: 'MYSQL_USER', password: 'MYSQL_PASSWORD', database: 'MYSQL_DATABASE' }
    };
    const runtime = newRuntime('mysql', 3306, '33060');
    const config = { MYSQL_USER: 'root', MYSQL_PASSWORD: 'secret', MYSQL_DATABASE: 'app' };
    const result = computeAccessPoints([mysqlAp], config, runtime);
    expect(result![0]!.connectionString).toBe('mysql://root:secret@localhost:33060/app');
  });

  it('falls back to old top-level assignedPorts format for backward compatibility', () => {
    const runtime = oldRuntime('5432/tcp', '49153');
    const config = { POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass', POSTGRES_DB: 'db' };
    const result = computeAccessPoints([pgAccessPoint], config, runtime);
    expect(result).toHaveLength(1);
    expect(result![0]!.hostPort).toBe(49153);
  });

  it('returns undefined when no access point has useful info after evaluation', () => {
    const apNoCredentials: AccessPoint = { name: 'UI', kind: 'web', service: 'ui', port: 3000 };
    expect(computeAccessPoints([apNoCredentials], {}, null)).toBeUndefined();
  });

  it('includes multiple access points when all have useful info', () => {
    const webAp: AccessPoint = { name: 'UI', kind: 'web', service: 'app', port: 8080 };
    const dbAp: AccessPoint = {
      name: 'DB', kind: 'mysql', service: 'db', port: 3306,
      connection: { password: 'MYSQL_PASSWORD' }
    };
    const runtime: Readonly<Record<string, unknown>> = {
      provider: 'docker',
      containers: [
        { name: 'app', id: 'c-1', assignedPorts: [{ containerPort: '8080/tcp', hostIp: '0.0.0.0', hostPort: '32100' }] },
        { name: 'db', id: 'c-2', assignedPorts: [{ containerPort: '3306/tcp', hostIp: '0.0.0.0', hostPort: '32101' }] }
      ],
      networkId: 'net-1', volumeIds: [], health: 'healthy', status: 'running', createdAt: '2026-07-30T10:00:00.000Z'
    };
    const config = { MYSQL_PASSWORD: 'dbpass' };
    const result = computeAccessPoints([webAp, dbAp], config, runtime);
    expect(result).toHaveLength(2);
  });

  it('omits access points for a service container that is not yet present in runtime', () => {
    // Runtime only has 'db', but webAp references 'app' — app not found → no hostPort, no creds → skipped
    const webAp: AccessPoint = { name: 'UI', kind: 'web', service: 'app', port: 8080 };
    const runtime = newRuntime('db', 3306, '32101');
    const result = computeAccessPoints([webAp], {}, runtime);
    expect(result).toBeUndefined();
  });
});
