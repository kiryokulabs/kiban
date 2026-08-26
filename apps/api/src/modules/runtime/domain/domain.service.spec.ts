import { describe, expect, it } from 'vitest';
import type { Environment, Project } from '@kiban/core';
import { DomainService } from './domain.service';

const project: Project = {
  id: 'project-1',
  name: 'Cross Metrics',
  description: null,
  createdAt: new Date('2026-08-04T10:00:00.000Z'),
  updatedAt: new Date('2026-08-04T10:00:00.000Z')
};

const environment: Environment = {
  id: 'env-1',
  projectId: 'project-1',
  name: 'Development',
  slug: 'development',
  type: 'system',
  description: null,
  createdAt: new Date('2026-08-04T10:00:00.000Z'),
  updatedAt: new Date('2026-08-04T10:00:00.000Z')
};

describe('DomainService', () => {
  it('builds local service hosts from service, environment and project slugs', async () => {
    const service = new DomainService({
      protocol: 'http',
      domains: { development: 'localhost', staging: 'localhost', production: 'localhost' }
    });

    await expect(service.buildHost({ project, environment, service: { id: 'grafana', name: 'Grafana' } })).resolves.toBe('grafana.development.cross-metrics.localhost');
  });

  it('uses the configured base domain without changing callers', async () => {
    const service = new DomainService({
      protocol: 'https',
      domains: { development: 'dev.example.com', staging: 'staging.example.com', production: 'example.com' }
    });

    await expect(service.buildUrl({ project, environment, service: { id: 'n8n', name: 'n8n' } })).resolves.toBe('https://n8n.development.cross-metrics.dev.example.com');
  });

  it('uses the configured wildcard domain when provided', async () => {
    const service = new DomainService(
      {
        protocol: 'https',
        domains: { development: 'localhost', staging: 'localhost', production: 'localhost' }
      },
      { getWildcardDomain: async () => 'apps.example.com' }
    );

    await expect(service.buildUrl({ project, environment, service: { id: 'plausible', name: 'Plausible' } })).resolves.toBe('https://plausible.development.cross-metrics.apps.example.com');
  });

  it('falls back to runtime config when wildcard domain is not configured', async () => {
    const service = new DomainService(
      {
        protocol: 'http',
        domains: { development: 'localhost', staging: 'localhost', production: 'localhost' }
      },
      { getWildcardDomain: async () => null }
    );

    await expect(service.buildUrl({ project, environment, service: { id: 'grafana', name: 'Grafana' } })).resolves.toBe('http://grafana.development.cross-metrics.localhost');
  });
});
