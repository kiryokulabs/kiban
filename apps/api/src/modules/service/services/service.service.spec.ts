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

const createService = (items: readonly InstalledService[], runtime: RuntimeProvider, overrides: Partial<Record<string, unknown>> = {}): ServiceService => {
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
    updateRuntime: async (_id: string, runtime: Readonly<Record<string, unknown>> | null) => ({ ...items[0]!, runtime }),
    delete: async () => undefined
  };
  const catalog = { listServiceDefinitions: async () => [definition] };
  const environments = { findById: async () => ({ id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: new Date(), updatedAt: new Date() }) };
  const projects = { findById: async () => ({ id: 'project-1', name: 'Project', description: null, createdAt: new Date(), updatedAt: new Date() }) };
  return new ServiceService({ ...manager, ...overrides } as never, runtime, catalog as never, environments as never, projects as never);
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

  it('updates the public service domain override', async () => {
    let persistedRuntime: Readonly<Record<string, unknown>> | null = null;
    const serviceWithEndpoint = installed({
      status: 'running',
      runtime: {
        provider: 'docker-compose',
        publicEndpoints: [{ name: 'Web UI', service: 'grafana', port: 3000, host: 'grafana.development.project.localhost', url: 'http://grafana.development.project.localhost', protocol: 'http' }]
      }
    });
    const runtime: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'stopped' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' }),
      updatePublicEndpoints: async (_service, publicEndpoints) => ({
        status: 'running',
        runtime: { ...serviceWithEndpoint.runtime, publicEndpoints }
      })
    };
    const service = createService([serviceWithEndpoint], runtime, {
      updateRuntime: async (_id: string, runtimeValue: Readonly<Record<string, unknown>> | null) => {
        persistedRuntime = runtimeValue;
        return { ...serviceWithEndpoint, runtime: runtimeValue };
      }
    });

    const result = await service.updateDomain('svc-1', { host: 'grafana.example.com' });

    const publicEndpoints = persistedRuntime?.['publicEndpoints'];
    expect(Array.isArray(publicEndpoints)).toBe(true);
    if (!Array.isArray(publicEndpoints)) throw new Error('Expected public endpoints to be persisted.');
    expect(publicEndpoints[0]).toMatchObject({
      host: 'grafana.example.com',
      url: 'http://grafana.example.com'
    });
    expect(result.accessPoints?.[0]?.url).toBe('http://grafana.example.com');
  });

  it('updates service domains for legacy public endpoints without an explicit protocol', async () => {
    let updatedEndpoints: readonly unknown[] = [];
    const serviceWithLegacyEndpoint = installed({
      status: 'running',
      runtime: {
        provider: 'docker-compose',
        publicEndpoints: [{ name: 'Web UI', service: 'grafana', port: 3000, host: 'grafana.development.project.localhost', url: 'http://grafana.development.project.localhost' }]
      }
    });
    const runtime: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'stopped' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' }),
      updatePublicEndpoints: async (_service, publicEndpoints) => {
        updatedEndpoints = publicEndpoints;
        return { status: 'running', runtime: { ...serviceWithLegacyEndpoint.runtime, publicEndpoints } };
      }
    };
    const service = createService([serviceWithLegacyEndpoint], runtime);

    await service.updateDomain('svc-1', { host: 'grafana.localhost' });

    expect(updatedEndpoints[0]).toMatchObject({
      host: 'grafana.localhost',
      url: 'http://grafana.localhost',
      protocol: 'http'
    });
  });

  it('rejects empty service domain overrides', async () => {
    const runtime: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'stopped' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' })
    };
    const service = createService([installed()], runtime);

    await expect(service.updateDomain('svc-1', { host: '   ' })).rejects.toThrow('Service domain is required.');
  });
});
