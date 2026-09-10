import { describe, expect, it } from 'vitest';
import type { Environment, InstalledService, RuntimeProvider, RuntimePublicEndpoint } from '@kiban/core';
import { DomainService } from '../../runtime/domain/domain.service';
import { RoutedRuntimeProvider } from './routed-runtime.provider';

const environment: Environment = { id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: new Date(), updatedAt: new Date() };
const installedService: InstalledService = { id: 'svc-1', environmentId: 'env-1', serviceId: 'n8n', name: 'n8n', status: 'running', configuration: {}, runtime: { provider: 'docker-compose' }, createdAt: new Date(), updatedAt: new Date() };

describe('RoutedRuntimeProvider', () => {
  it('delegates public endpoint updates to the wrapped runtime provider', async () => {
    const endpoints: readonly RuntimePublicEndpoint[] = [{ name: 'Web UI', service: 'n8n', port: 5678, host: 'n8n.localhost', url: 'http://n8n.localhost', protocol: 'http' }];
    let delegatedEndpoints: readonly RuntimePublicEndpoint[] = [];
    const delegate: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'removing' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' }),
      updatePublicEndpoints: async (_service, publicEndpoints) => {
        delegatedEndpoints = publicEndpoints;
        return { status: 'running', runtime: { publicEndpoints } };
      }
    };
    const projects = { findById: async () => ({ id: 'project-1', name: 'Crossmetrics', description: null, createdAt: new Date(), updatedAt: new Date() }) };
    const provider = new RoutedRuntimeProvider(delegate, projects as never, new DomainService({ protocol: 'http', domains: { development: 'localhost', staging: 'localhost', production: 'localhost' } }));

    const result = await provider.updatePublicEndpoints!(installedService, endpoints);

    expect(delegatedEndpoints).toEqual(endpoints);
    expect(result.runtime?.['publicEndpoints']).toEqual(endpoints);
  });


  it('generates HTTPS public endpoints for services under a non-localhost domain', async () => {
    let delegatedEndpoints: readonly RuntimePublicEndpoint[] = [];
    const delegate: RuntimeProvider = {
      install: async (plan) => { delegatedEndpoints = plan.publicEndpoints ?? []; return { status: 'running', runtime: { publicEndpoints: delegatedEndpoints } }; },
      uninstall: async () => ({ status: 'removing' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' })
    };
    const projects = { findById: async () => ({ id: 'project-1', name: 'Crossmetrics', description: null, createdAt: new Date(), updatedAt: new Date() }) };
    const domains = new DomainService(
      { protocol: 'http', domains: { development: 'localhost', staging: 'localhost', production: 'localhost' } },
      { getWildcardDomain: async () => 'services.example.com' }
    );
    const provider = new RoutedRuntimeProvider(delegate, projects as never, domains);

    await provider.install({
      environment,
      variables: {},
      serviceDefinition: {
        id: 'n8n',
        metadata: { id: 'n8n', name: 'n8n', description: 'Automation', category: 'automation', author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [{ name: 'Web UI', kind: 'web', service: 'n8n', port: 5678 }] },
        composeYaml: `services:
  n8n:
    image: n8nio/n8n
`,
        runtime: { services: [] },
        schema: {},
        icon: '<svg />',
        sourcePath: '/catalog/automation/n8n'
      }
    });

    expect(delegatedEndpoints[0]).toMatchObject({
      host: 'n8n-development-crossmetrics.services.example.com',
      url: 'https://n8n-development-crossmetrics.services.example.com',
      protocol: 'https'
    });
  });

  it('returns the existing runtime when the wrapped runtime cannot update public endpoints', async () => {
    const delegate: RuntimeProvider = {
      install: async () => ({ status: 'running' }),
      uninstall: async () => ({ status: 'removing' }),
      start: async () => ({ status: 'running' }),
      stop: async () => ({ status: 'stopped' }),
      restart: async () => ({ status: 'running' }),
      health: async () => ({ status: 'healthy' })
    };
    const projects = { findById: async () => null };
    const provider = new RoutedRuntimeProvider(delegate, projects as never, new DomainService({ protocol: 'http', domains: { development: 'localhost', staging: 'localhost', production: 'localhost' } }));

    await expect(provider.updatePublicEndpoints!(installedService, [])).resolves.toEqual({ status: 'running', runtime: installedService.runtime });
  });
});
