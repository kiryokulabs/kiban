import { describe, expect, it } from 'vitest';
import { ServiceDetailsPresenter } from './service-details.presenter';
import type { AccessPoint, InstalledService } from '../installed-services/installed-services.models';

const createService = (overrides?: Partial<InstalledService>): InstalledService => ({
  id: 'svc-1', environmentId: 'env-1', serviceId: 'nginx', name: 'Nginx',
  status: 'running', configuration: {}, runtime: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const webAp = (overrides?: Partial<AccessPoint>): AccessPoint => ({
  name: 'Web UI', kind: 'web', port: 80, host: 'localhost', hostPort: 38080, ...overrides
});

const dbAp = (overrides?: Partial<AccessPoint>): AccessPoint => ({
  name: 'Database', kind: 'postgres', port: 5432, host: 'localhost', hostPort: 35432,
  connectionString: 'postgresql://localhost:35432', ...overrides
});

describe('ServiceDetailsPresenter', () => {
  const presenter = new ServiceDetailsPresenter();

  describe('accessPointsFor', () => {
    it('returns accessPoints from the service when present', () => {
      const aps: readonly AccessPoint[] = [webAp()];
      const service = createService({ accessPoints: aps });
      expect(presenter.accessPointsFor(service)).toBe(aps);
    });

    it('falls back to legacy URLs from runtime assignedPorts when no accessPoints', () => {
      const service = createService({ runtime: { assignedPorts: [{ containerPort: 80, hostPort: '38080' }] } });
      const result = presenter.accessPointsFor(service);
      expect(result).toHaveLength(1);
      expect(result![0]?.kind).toBe('web');
      expect(result![0]?.hostPort).toBe(38080);
    });

    it('returns undefined when neither accessPoints nor legacy URLs exist', () => {
      const service = createService({ runtime: null });
      expect(presenter.accessPointsFor(service)).toBeUndefined();
    });
  });

  describe('hasAccessPoints', () => {
    it('returns true when service has access points', () => {
      const service = createService({ accessPoints: [webAp()] });
      expect(presenter.hasAccessPoints(service)).toBe(true);
    });

    it('returns true when service has database access points', () => {
      const service = createService({ accessPoints: [dbAp()] });
      expect(presenter.hasAccessPoints(service)).toBe(true);
    });

    it('returns false when service has no access points', () => {
      const service = createService({});
      expect(presenter.hasAccessPoints(service)).toBe(false);
    });

    it('returns false when service has empty access points', () => {
      const service = createService({ accessPoints: [] });
      expect(presenter.hasAccessPoints(service)).toBe(false);
    });
  });

  describe('hasWebAccess', () => {
    it('returns false when access points contain only non-web kinds', () => {
      const accessPoints: readonly AccessPoint[] = [dbAp()];
      expect(presenter.hasWebAccess(accessPoints)).toBe(false);
    });

    it('returns true when access points contain a web kind', () => {
      const accessPoints: readonly AccessPoint[] = [webAp()];
      expect(presenter.hasWebAccess(accessPoints)).toBe(true);
    });

    it('returns true when mixed web and non-web access points', () => {
      const accessPoints: readonly AccessPoint[] = [
        webAp({ name: 'Web UI', port: 7474 }),
        { name: 'Bolt', kind: 'neo4j', port: 7687, host: 'localhost', hostPort: 47687 }
      ];
      expect(presenter.hasWebAccess(accessPoints)).toBe(true);
    });

    it('returns false when accessPoints is empty', () => {
      expect(presenter.hasWebAccess([])).toBe(false);
    });

    it('returns false when accessPoints is undefined', () => {
      expect(presenter.hasWebAccess(undefined)).toBe(false);
    });
  });

  describe('hasDatabaseAccess', () => {
    it('returns true when at least one access point is non-web', () => {
      const accessPoints: readonly AccessPoint[] = [dbAp()];
      expect(presenter.hasDatabaseAccess(accessPoints)).toBe(true);
    });

    it('returns false when only web access points', () => {
      const accessPoints: readonly AccessPoint[] = [webAp()];
      expect(presenter.hasDatabaseAccess(accessPoints)).toBe(false);
    });

    it('returns true for redis kind (non-web)', () => {
      const accessPoints: readonly AccessPoint[] = [
        { name: 'Cache', kind: 'redis', port: 6379, host: 'localhost', hostPort: 36379 }
      ];
      expect(presenter.hasDatabaseAccess(accessPoints)).toBe(true);
    });

    it('returns true for mysql kind (non-web)', () => {
      const accessPoints: readonly AccessPoint[] = [
        { name: 'DB', kind: 'mysql', port: 3306, host: 'localhost', hostPort: 33306 }
      ];
      expect(presenter.hasDatabaseAccess(accessPoints)).toBe(true);
    });
  });

  describe('webUrls', () => {
    it('returns URLs for web-kind access points', () => {
      const accessPoints: readonly AccessPoint[] = [webAp()];
      expect(presenter.webUrls(accessPoints)).toEqual(['http://localhost:38080']);
    });

    it('prefers backend-provided URLs for reverse-proxied web access points', () => {
      const accessPoints: readonly AccessPoint[] = [webAp({ host: 'grafana.crossmetrics.localhost', url: 'http://grafana.crossmetrics.localhost' })];
      expect(presenter.webUrls(accessPoints)).toEqual(['http://grafana.crossmetrics.localhost']);
    });

    it('ignores non-web access points', () => {
      const accessPoints: readonly AccessPoint[] = [dbAp(), webAp()];
      expect(presenter.webUrls(accessPoints)).toEqual(['http://localhost:38080']);
    });

    it('returns multiple web URLs when multiple web access points', () => {
      const accessPoints: readonly AccessPoint[] = [
        { name: 'API', kind: 'web', port: 9000, host: 'localhost', hostPort: 49000 },
        { name: 'Console', kind: 'web', port: 9001, host: 'localhost', hostPort: 49001 }
      ];
      expect(presenter.webUrls(accessPoints)).toEqual(['http://localhost:49000', 'http://localhost:49001']);
    });

    it('returns empty array when no web access points', () => {
      expect(presenter.webUrls([dbAp()])).toEqual([]);
    });

    it('returns empty array when accessPoints is undefined', () => {
      expect(presenter.webUrls(undefined)).toEqual([]);
    });
  });

  describe('databaseAccessPoints', () => {
    it('returns only non-web access points', () => {
      const accessPoints: readonly AccessPoint[] = [webAp(), dbAp({ username: 'user', password: 'pass', database: 'mydb' })];
      const result = presenter.databaseAccessPoints(accessPoints);
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Database');
    });

    it('returns empty array when accessPoints is undefined', () => {
      expect(presenter.databaseAccessPoints(undefined)).toEqual([]);
    });
  });

  describe('networkAccessPoint', () => {
    it('returns host:hostPort for a connected access point', () => {
      const ap: AccessPoint = dbAp({ hostPort: 35432 });
      expect(presenter.networkAccessPoint(ap)).toBe('localhost:35432');
    });
  });

  describe('serviceLabel', () => {
    it('returns the capitalized runtime provider type label', () => {
      expect(presenter.serviceLabel({ provider: 'docker' })).toBe('Docker');
    });

    it('returns Unknown when runtime has no provider', () => {
      expect(presenter.serviceLabel(null)).toBe('Unknown');
    });
  });

  describe('obfuscatedConnectionString', () => {
    it('hides the password in a connection string', () => {
      const ap: AccessPoint = {
        name: 'Database', kind: 'postgres', port: 5432, host: 'localhost', hostPort: 35432,
        username: 'user', password: 'secret123', database: 'mydb',
        connectionString: 'postgresql://user:secret123@localhost:35432/mydb'
      };
      expect(presenter.obfuscatedConnectionString(ap)).toBe('postgresql://user:••••••••@localhost:35432/mydb');
    });

    it('returns connection string unchanged when no password', () => {
      const ap: AccessPoint = {
        name: 'Cache', kind: 'redis', port: 6379, host: 'localhost', hostPort: 36379,
        connectionString: 'redis://localhost:36379'
      };
      expect(presenter.obfuscatedConnectionString(ap)).toBe('redis://localhost:36379');
    });

    it('returns empty string when connectionString is undefined', () => {
      const ap: AccessPoint = { name: 'Database', kind: 'postgres', port: 5432, host: 'localhost', hostPort: 35432 };
      expect(presenter.obfuscatedConnectionString(ap)).toBe('');
    });
  });
});

describe('ServiceDetailsPresenter management page helpers', () => {
  const presenter = new ServiceDetailsPresenter();
  const details = {
    location: { project: { id: 'project-1', name: 'CrossMetrics' }, environment: { id: 'env-1', name: 'Development', type: 'system' } },
    overview: { name: 'Service', description: 'A generic service', icon: '<svg />', category: 'databases', status: 'running', health: 'healthy', installedVersion: '1', runtime: 'docker', installedAt: '2026-01-01T00:00:00.000Z' },
    accessPoints: [{ name: 'Database', kind: 'database', port: 5432, hostPort: 45432, host: 'localhost', username: 'kiban', password: 'secret', database: 'app', connectionString: 'database://kiban:secret@localhost:45432/app' }],
    configuration: { schema: { type: 'object', properties: { APP_PASSWORD: { type: 'string', title: 'Password' } }, required: ['APP_PASSWORD'] }, values: { APP_PASSWORD: 'secret' } },
    containers: [{ id: 'c1', name: 'db', status: 'running', health: 'healthy', image: 'example/db:1', restartCount: 1 }],
    volumes: [{ name: 'data', mountPath: '/data' }],
    networking: { assignedPorts: [{ hostPort: 45432, internalPort: 5432, protocol: 'tcp' }], networks: [{ name: 'kiban-env' }] },
    errors: [{ state: 'exited', exitCode: 1, lastError: 'boom' }],
    logs: { value: 'log line', containers: ['db'] },
    installedService: createService()
  };



  it('returns the project and environment labels from the backend DTO', () => {
    expect(presenter.locationLabel(details)).toBe('CrossMetrics / Development');
  });

  it('returns schema fields for dynamic configuration forms', () => {
    expect(presenter.schemaFields(details).map((field) => field.key)).toEqual(['APP_PASSWORD']);
  });

  it('identifies required dynamic configuration fields', () => {
    expect(presenter.schemaFields(details)[0]?.required).toBe(true);
  });

  it('hides passwords by default', () => {
    expect(presenter.displaySecret('secret', false)).toBe('••••••••');
  });

  it('shows passwords only when requested', () => {
    expect(presenter.displaySecret('secret', true)).toBe('secret');
  });

  it('returns copyable access fields', () => {
    const fields = presenter.copyFieldsFor(details.accessPoints[0]!);
    expect(fields.map((field) => field.label)).toContain('Connection String');
    expect(fields.map((field) => field.label)).toContain('Password');
  });

  it('returns multi-container, volume, network, error and log sections from DTO only', () => {
    expect(presenter.containers(details)).toHaveLength(1);
    expect(presenter.volumes(details)).toHaveLength(1);
    expect(presenter.networks(details)).toHaveLength(1);
    expect(presenter.errors(details)).toHaveLength(1);
    expect(presenter.logs(details)).toBe('log line');
  });

  it('returns copyable local terminal commands using container IDs', () => {
    expect(presenter.terminalCommands(details)).toEqual([
      { containerName: 'db', command: 'docker exec -it c1 sh' }
    ]);
  });

  it('uses container IDs even when container names are complex', () => {
    const withComplexName = {
      ...details,
      containers: [{ id: 'a1b2c3d4e5f6', name: 'kiban-9ee18496-supabase-supabase-1', status: 'running', health: 'healthy', image: 'example/app:1', restartCount: 0 }]
    };

    expect(presenter.terminalCommands(withComplexName)[0]?.command).toBe('docker exec -it a1b2c3d4e5f6 sh');
  });
});
