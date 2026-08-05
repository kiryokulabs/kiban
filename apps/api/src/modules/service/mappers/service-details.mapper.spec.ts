import { describe, expect, it } from 'vitest';
import type { InstalledService, ServiceDefinition } from '@kiban/core';
import { mapInstalledServiceDetails } from './service-details.mapper';

const definition: ServiceDefinition = {
  id: 'generic-db',
  metadata: {
    id: 'generic-db',
    name: 'Generic Database',
    description: 'A generic service',
    category: 'databases',
    author: 'Kiban',
    minimumVersion: '0.1.0',
    accessPoints: [{ name: 'Database', kind: 'database', service: 'db', port: 5432, connection: { username: 'APP_USER', password: 'APP_PASSWORD', database: 'APP_DATABASE' } }]
  },
  composeYaml: '',
  runtime: {
    services: [{
      name: 'db', image: 'example/database', tag: '1', ports: [{ port: 5432, protocol: 'tcp' }], environment: [],
      volumes: [{ name: 'data', target: '/var/lib/data' }], restart: 'unless-stopped', dependsOn: [], labels: {}
    }]
  },
  schema: { type: 'object', properties: { APP_USER: { type: 'string' }, APP_PASSWORD: { type: 'string' } }, required: ['APP_PASSWORD'], additionalProperties: false },
  icon: '<svg />',
  sourcePath: '/catalog/generic-db'
};

const location = { project: { id: 'project-1', name: 'CrossMetrics' }, environment: { id: 'env-1', name: 'Development', type: 'system' as const } };

const service = (overrides?: Partial<InstalledService>): InstalledService => ({
  id: 'installed-1',
  environmentId: 'env-1',
  serviceId: 'generic-db',
  name: 'Generic Database',
  status: 'running',
  configuration: { APP_USER: 'kiban', APP_PASSWORD: 'secret', APP_DATABASE: 'app' },
  runtime: {
    provider: 'docker', status: 'running', health: 'healthy', createdAt: '2026-07-30T10:00:00.000Z',
    containers: [{ name: 'db', id: 'container-1', status: 'running', health: 'healthy', image: 'example/database:1', restartCount: 2, assignedPorts: [{ containerPort: '5432/tcp', hostPort: '45432' }] }],
    volumeIds: ['kiban-env-db-data'], networkIds: ['kiban-env-network']
  },
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  ...overrides
});

describe('mapInstalledServiceDetails', () => {
  it('renders overview from installed service and service definition', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'logs', location);
    expect(details.overview).toMatchObject({ name: 'Generic Database', category: 'databases', status: 'running', health: 'healthy', installedVersion: '1', runtime: 'docker' });
  });



  it('includes the project and environment where the service is installed', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'logs', location);
    expect(details.location).toEqual(location);
  });

  it('renders access points and backend-generated connection strings without service-specific logic', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'logs', location);
    expect(details.accessPoints[0]).toMatchObject({ host: 'localhost', hostPort: 45432, username: 'kiban', password: 'secret', database: 'app', connectionString: 'database://kiban:secret@localhost:45432/app' });
  });

  it('includes schema and current configuration for dynamic forms', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'logs', location);
    expect(details.configuration.schema).toBe(definition.schema);
    expect(details.configuration.values['APP_PASSWORD']).toBe('secret');
  });

  it('renders multi-container runtime, volumes and networking from generic runtime metadata', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'logs', location);
    expect(details.containers).toEqual([{ id: 'container-1', name: 'db', status: 'running', health: 'healthy', image: 'example/database:1', restartCount: 2 }]);
    expect(details.volumes).toEqual([{ name: 'kiban-env-db-data', mountPath: '/var/lib/data' }]);
    expect(details.networking.assignedPorts).toEqual([{ hostPort: 45432, internalPort: 5432, protocol: 'tcp' }]);
    expect(details.networking.networks).toEqual([{ name: 'kiban-env-network' }]);
  });

  it('renders runtime errors with state, exit code and last error', () => {
    const details = mapInstalledServiceDetails(service({ status: 'failed', runtime: { provider: 'docker', state: 'exited', exitCode: 137, lastError: 'Out of memory' } }), definition, 'logs', location);
    expect(details.errors).toEqual([{ state: 'exited', exitCode: 137, lastError: 'Out of memory' }]);
  });

  it('includes logs and logs metadata', () => {
    const details = mapInstalledServiceDetails(service(), definition, 'line 1', location);
    expect(details.logs).toEqual({ value: 'line 1', containers: ['db'] });
  });
});
