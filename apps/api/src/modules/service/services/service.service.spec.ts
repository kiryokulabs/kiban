import { describe, expect, it } from 'vitest';
import type { InstalledService, RuntimeProvider, ServiceDefinition } from '@kiban/core';
import { ServiceService } from './service.service';

const installed = (overrides: Partial<InstalledService> = {}): InstalledService => ({
  id: 'svc-1',
  environmentId: 'env-1',
  serviceId: 'grafana',
  name: 'Grafana',
  status: 'failed',
  configuration: { SERVICE_USER_GRAFANA: 'admin', SERVICE_PASSWORD_GRAFANA: 'secret' },
  runtime: { provider: 'docker-compose', status: 'failed' },
  createdAt: new Date('2026-08-01T10:00:00.000Z'),
  updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  ...overrides
});

const definition: ServiceDefinition = {
  id: 'grafana',
  metadata: {
    id: 'grafana',
    name: 'Grafana',
    description: 'Dashboard',
    category: 'monitoring',
    author: 'Kiban',
    minimumVersion: '0.1.0',
    accessPoints: [{ name: 'Web UI', kind: 'web', service: 'grafana', port: 3000 }]
  },
  composeYaml: 'services:\n  grafana:\n    image: grafana/grafana-oss\n',
  runtime: { services: [] },
  schema: {},
  icon: '<svg />',
  sourcePath: '/catalog/monitoring/grafana'
};

const createService = (items: readonly InstalledService[], runtime: RuntimeProvider): ServiceService => {
  const manager = {
    listAll: async () => items,
    listByEnvironment: async () => items,
    get: async () => items[0]!,
    install: async () => items[0]!,
    updateConfiguration: async () => items[0]!,
    recreate: async () => items[0]!,
    start: async () => items[0]!,
    stop: async () => items[0]!,
    restart: async () => items[0]!,
    delete: async () => undefined
  };
  const catalog = { listServiceDefinitions: async () => [definition] };
  const environments = { findById: async () => ({ id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: new Date(), updatedAt: new Date() }) };
  const projects = { findById: async () => ({ id: 'project-1', name: 'Project', description: null, createdAt: new Date(), updatedAt: new Date() }) };
  return new ServiceService(manager as never, runtime, catalog as never, environments as never, projects as never);
};

describe('ServiceService runtime state enrichment', () => {
  it('refreshes runtime state before returning environment service lists', async () => {
    const runtime: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'stopped' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' }),
      refresh: async () => ({
        status: 'running',
        runtime: {
          provider: 'docker-compose',
          status: 'running',
          publicEndpoints: [{ name: 'Web UI', service: 'grafana', port: 3000, host: 'grafana.project.localhost', url: 'http://grafana.project.localhost' }]
        }
      })
    };

    const service = createService([installed()], runtime);

    const result = await service.list('project-1', 'env-1');

    expect(result[0]!.status).toBe('running');
    expect(result[0]!.accessPoints?.[0]?.url).toBe('http://grafana.project.localhost');
  });

  it('refreshes runtime state before returning the global installed services list', async () => {
    const runtime: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'stopped' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' }),
      refresh: async () => ({ status: 'running', runtime: { provider: 'docker-compose', status: 'running' } })
    };

    const service = createService([installed()], runtime);

    const result = await service.listAll();

    expect(result[0]!.status).toBe('running');
  });
});
