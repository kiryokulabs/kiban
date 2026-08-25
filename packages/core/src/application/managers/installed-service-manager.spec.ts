import { describe, expect, it, vi } from 'vitest';
import type { CatalogCategory } from '../../domain/catalog/catalog-item.js';
import type { ServiceDefinition } from '../../domain/catalog/service-definition.js';
import type { Environment } from '../../domain/projects/project.js';
import { ProjectNotFoundError, ProjectValidationError } from '../../domain/projects/project-errors.js';
import type { InstalledService } from '../../domain/services/installed-service.js';
import type { InstallationPlan, InstalledServiceRepository, RuntimeProvider } from '../interfaces/installed-service-repository.js';
import type { CatalogRepository } from '../interfaces/catalog-repository.js';
import type { EnvironmentRepository } from '../interfaces/project-repository.js';
import { InstalledServiceManager } from './installed-service-manager.js';

const now = new Date('2026-07-30T10:00:00.000Z');
const category: CatalogCategory = { id: 'databases', name: 'Databases' };

const serviceDefinition: ServiceDefinition = {
  id: 'postgresql',
  metadata: {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Database',
    category: 'databases',
    author: 'Kiban',
    minimumVersion: '0.1.0',
    accessPoints: [
      {
        name: 'Database',
        kind: 'postgres',
        service: 'postgresql',
        port: 5432,
        connection: { username: 'POSTGRES_USER', password: 'POSTGRES_PASSWORD', database: 'POSTGRES_DB' }
      }
    ]
  },
  composeYaml: 'services:\n  postgresql:\n    image: postgres:17\n',
  runtime: {
    services: [
      {
        name: 'postgresql',
        image: 'postgres',
        tag: '17',
        ports: [{ port: 5432, protocol: 'tcp' as const }],
        environment: [
          { key: 'POSTGRES_DB', value: 'kiban', required: false },
          { key: 'POSTGRES_USER', value: 'kiban', required: false },
          { key: 'POSTGRES_PASSWORD', required: true }
        ],
        volumes: [{ name: 'postgresql_data', target: '/var/lib/postgresql/data' }],
        restart: 'unless-stopped' as const,
        dependsOn: [],
        labels: {}
      }
    ]
  },
  schema: {
    type: 'object',
    required: ['POSTGRES_PASSWORD'],
    properties: { POSTGRES_PASSWORD: { type: 'string' } },
    additionalProperties: false
  },
  icon: '<svg></svg>',
  sourcePath: '/catalog/databases/postgresql'
};

class MemoryCatalogRepository implements CatalogRepository {
  public constructor(private readonly items: readonly ServiceDefinition[] = [serviceDefinition]) {}
  public async listCategories(): Promise<readonly CatalogCategory[]> { return [category]; }
  public async listItems(): Promise<readonly ServiceDefinition[]> { return this.items; }
}

class MemoryEnvironmentRepository implements EnvironmentRepository {
  public readonly environment: Environment = { id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: now, updatedAt: now };
  public async create(): Promise<Environment> { return this.environment; }
  public async listByProjectId(projectId: string): Promise<readonly Environment[]> { return projectId === this.environment.projectId ? [this.environment] : []; }
  public async findById(id: string): Promise<Environment | null> { return id === this.environment.id ? this.environment : null; }
  public async deleteById(): Promise<void> {}
  public async deleteByProjectId(): Promise<void> {}
}

class MemoryInstalledServiceRepository implements InstalledServiceRepository {
  public readonly services = new Map<string, InstalledService>();
  private nextId = 1;
  public async create(input: Omit<InstalledService, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstalledService> {
    const service = { ...input, id: `installed-${this.nextId}`, createdAt: now, updatedAt: now };
    this.nextId += 1;
    this.services.set(service.id, service);
    return service;
  }
  public async findById(id: string): Promise<InstalledService | null> { return this.services.get(id) ?? null; }
  public async listAll(): Promise<readonly InstalledService[]> { return [...this.services.values()]; }
  public async listByEnvironmentId(environmentId: string): Promise<readonly InstalledService[]> { return [...this.services.values()].filter((service) => service.environmentId === environmentId); }
  public async findByEnvironmentIdAndName(environmentId: string, name: string): Promise<InstalledService | null> { return [...this.services.values()].find((service) => service.environmentId === environmentId && service.name === name) ?? null; }
  public async updateStatus(id: string, status: InstalledService['status'], runtime?: Readonly<Record<string, unknown>> | null): Promise<InstalledService | null> { const service = this.services.get(id); if (!service) return null; const updated = { ...service, status, runtime: runtime === undefined ? service.runtime : runtime, updatedAt: now }; this.services.set(id, updated); return updated; }
  public async updateConfiguration(id: string, configuration: Readonly<Record<string, unknown>>, status: InstalledService['status'], runtime?: Readonly<Record<string, unknown>> | null): Promise<InstalledService | null> { const service = this.services.get(id); if (!service) return null; const updated = { ...service, configuration, status, runtime: runtime === undefined ? service.runtime : runtime, updatedAt: now }; this.services.set(id, updated); return updated; }
  public async delete(id: string): Promise<boolean> { return this.services.delete(id); }
}

const createManager = (catalog: CatalogRepository = new MemoryCatalogRepository()) => {
  const installed = new MemoryInstalledServiceRepository();
  const environments = new MemoryEnvironmentRepository();
  const runtime: RuntimeProvider = {
    install: vi.fn(async () => ({ status: 'running' as const, runtime: { provider: 'test' } })),
    uninstall: vi.fn(async () => ({ status: 'stopped' as const, runtime: { provider: 'test' } })),
    start: vi.fn(async () => ({ status: 'running' as const, runtime: { provider: 'test' } })),
    stop: vi.fn(async () => ({ status: 'stopped' as const, runtime: { provider: 'test' } })),
    restart: vi.fn(async () => ({ status: 'running' as const, runtime: { provider: 'test' } })),
    health: vi.fn(async () => ({ status: 'healthy' as const }))
  };
  const manager = new InstalledServiceManager(installed, environments, catalog, runtime);
  return { manager, installed, environments, runtime };
};

describe('InstalledServiceManager', () => {
  it('installs a service through the runtime and persists the installed service', async () => {
    const { manager, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    expect(service).toMatchObject({ environmentId: 'env-1', serviceId: 'postgresql', name: 'PostgreSQL', status: 'running', configuration: { POSTGRES_PASSWORD: 'secret' } });
    expect(runtime.install).toHaveBeenCalledOnce();
  });

  it('rejects unknown services', async () => {
    const { manager } = createManager(new MemoryCatalogRepository([]));
    await expect(manager.install('project-1', 'env-1', { serviceId: 'missing', configuration: {} })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('rejects unknown environments', async () => {
    const { manager } = createManager();
    await expect(manager.install('project-1', 'missing', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } })).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('rejects invalid configuration from schema', async () => {
    const { manager } = createManager();
    await expect(manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: {} })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('rejects duplicate installed service names in the same environment', async () => {
    const { manager } = createManager();
    await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('lists installed services for an environment', async () => {
    const { manager } = createManager();
    await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.listByEnvironment('project-1', 'env-1')).resolves.toHaveLength(1);
  });

  it('uninstalls runtime resources before deleting an installed service record', async () => {
    const { manager, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await manager.delete(service.id);
    await expect(manager.get(service.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(runtime.uninstall).toHaveBeenCalledWith(expect.objectContaining({ id: service.id }));
  });

  it('starts a stopped service', async () => {
    const { manager } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await manager.stop(service.id);
    await expect(manager.start(service.id)).resolves.toMatchObject({ status: 'running' as const, runtime: { provider: 'test' } });
  });

  it('stops a running service', async () => {
    const { manager } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.stop(service.id)).resolves.toMatchObject({ status: 'stopped' as const, runtime: { provider: 'test' } });
  });

  it('restarts a service', async () => {
    const { manager, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.restart(service.id)).resolves.toMatchObject({ status: 'running' as const, runtime: { provider: 'test' } });
    expect(runtime.restart).toHaveBeenCalledOnce();
  });



  it('saves configuration by recreating runtime resources', async () => {
    const { manager, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'old' } });
    await expect(manager.updateConfiguration(service.id, { POSTGRES_PASSWORD: 'new' })).resolves.toMatchObject({ configuration: { POSTGRES_PASSWORD: 'new' }, status: 'running' });
    expect(runtime.uninstall).toHaveBeenCalledWith(expect.objectContaining({ id: service.id }));
    expect(runtime.install).toHaveBeenCalledTimes(2);
    expect(runtime.install).toHaveBeenLastCalledWith(expect.objectContaining({ variables: { POSTGRES_PASSWORD: 'new' } }));
  });

  it('preserves existing public endpoints when saving configuration', async () => {
    const { manager, installed, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'old' } });
    const publicEndpoints = [{ name: 'Web', service: 'postgresql', port: 5432, host: 'postgres.example.com', url: 'http://postgres.example.com', protocol: 'http' as const }];
    installed.services.set(service.id, { ...service, runtime: { provider: 'test', publicEndpoints } });

    await manager.updateConfiguration(service.id, { POSTGRES_PASSWORD: 'new' });

    const lastPlan = vi.mocked(runtime.install).mock.calls.at(-1)?.[0] as InstallationPlan | undefined;
    expect(lastPlan?.publicEndpoints).toEqual(publicEndpoints);
  });

  it('preserves existing public endpoints when recreating a service', async () => {
    const { manager, installed, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    const publicEndpoints = [{ name: 'Web', service: 'postgresql', port: 5432, host: 'custom.example.com', url: 'http://custom.example.com', protocol: 'http' as const }];
    installed.services.set(service.id, { ...service, runtime: { provider: 'test', publicEndpoints } });

    await manager.recreate(service.id);

    const lastPlan = vi.mocked(runtime.install).mock.calls.at(-1)?.[0] as InstallationPlan | undefined;
    expect(lastPlan?.publicEndpoints).toEqual(publicEndpoints);
  });

  it('recreates a service using the existing configuration', async () => {
    const { manager, runtime } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.recreate(service.id)).resolves.toMatchObject({ configuration: { POSTGRES_PASSWORD: 'secret' }, status: 'running' });
    expect(runtime.uninstall).toHaveBeenCalledWith(expect.objectContaining({ id: service.id }));
    expect(runtime.install).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid status transitions', async () => {
    const { manager } = createManager();
    const service = await manager.install('project-1', 'env-1', { serviceId: 'postgresql', configuration: { POSTGRES_PASSWORD: 'secret' } });
    await expect(manager.start(service.id)).rejects.toBeInstanceOf(ProjectValidationError);
  });
});
