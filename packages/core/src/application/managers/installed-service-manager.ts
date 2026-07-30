import type { CatalogItem } from '../../domain/catalog/catalog-item.js';
import type { Environment } from '../../domain/projects/project.js';
import { ProjectNotFoundError, ProjectValidationError } from '../../domain/projects/project-errors.js';
import type { InstallServiceInput, InstalledService, InstalledServiceStatus } from '../../domain/services/installed-service.js';
import type { CatalogRepository } from '../interfaces/catalog-repository.js';
import type { InstallationPlan, InstalledServiceRepository, RuntimeProvider } from '../interfaces/installed-service-repository.js';
import type { EnvironmentRepository } from '../interfaces/project-repository.js';

const STATUS_TRANSITIONS: Readonly<Record<InstalledServiceStatus, readonly InstalledServiceStatus[]>> = {
  pending: ['installing', 'removing'],
  installing: ['running', 'failed'],
  running: ['stopped', 'removing'],
  stopped: ['running', 'removing'],
  failed: ['removing'],
  removing: []
};

/** Coordinates generic service installation without depending on a concrete runtime. */
export class InstalledServiceManager {
  public constructor(
    private readonly installedServices: InstalledServiceRepository,
    private readonly environments: EnvironmentRepository,
    private readonly catalog: CatalogRepository,
    private readonly runtime: RuntimeProvider
  ) {}

  /** Installs a catalog service into an environment through a generic runtime plan. */
  public async install(projectId: string, environmentId: string, input: InstallServiceInput): Promise<InstalledService> {
    const environment = await this.validateEnvironment(projectId, environmentId);
    const serviceDefinition = await this.validateServiceDefinition(input.serviceId);
    this.validateConfiguration(serviceDefinition, input.configuration);
    const duplicate = await this.installedServices.findByEnvironmentIdAndName(environment.id, serviceDefinition.name);
    if (duplicate) {
      throw new ProjectValidationError('A service with this name is already installed in this environment.');
    }
    const plan = this.createInstallationPlan(environment, serviceDefinition, input.configuration);
    const result = await this.runtime.install(plan);
    const status = result.status === 'running' ? 'running' : 'failed';
    return this.installedServices.create({ environmentId: environment.id, serviceId: serviceDefinition.id, name: serviceDefinition.name, status, configuration: input.configuration, runtime: result.runtime ?? null });
  }

  /** Lists every installed service. */
  public listAll(): Promise<readonly InstalledService[]> {
    return this.installedServices.listAll();
  }

  /** Lists installed services in an environment. */
  public async listByEnvironment(projectId: string, environmentId: string): Promise<readonly InstalledService[]> {
    const environment = await this.validateEnvironment(projectId, environmentId);
    return this.installedServices.listByEnvironmentId(environment.id);
  }

  /** Gets one installed service. */
  public async get(id: string): Promise<InstalledService> {
    const service = await this.installedServices.findById(id);
    if (!service) {
      throw new ProjectNotFoundError();
    }
    return service;
  }

  /** Removes only the installed service record. Runtime resources are out of scope for this milestone. */
  public async delete(id: string): Promise<void> {
    const service = await this.get(id);
    await this.runtime.uninstall(service);
    const deleted = await this.installedServices.delete(id);
    if (!deleted) {
      throw new ProjectNotFoundError();
    }
  }

  /** Starts a stopped service through the runtime provider. */
  public async start(id: string): Promise<InstalledService> {
    const service = await this.get(id);
    this.assertTransition(service.status, 'running');
    const result = await this.runtime.start(service);
    return this.updateStatus(id, result.status, result.runtime);
  }

  /** Stops a running service through the runtime provider. */
  public async stop(id: string): Promise<InstalledService> {
    const service = await this.get(id);
    this.assertTransition(service.status, 'stopped');
    const result = await this.runtime.stop(service);
    return this.updateStatus(id, result.status, result.runtime);
  }

  /** Restarts a service through the runtime provider. */
  public async restart(id: string): Promise<InstalledService> {
    const service = await this.get(id);
    const result = await this.runtime.restart(service);
    return this.updateStatus(id, result.status, result.runtime);
  }

  private async validateEnvironment(projectId: string, environmentId: string): Promise<Environment> {
    const environment = await this.environments.findById(environmentId);
    if (!environment || environment.projectId !== projectId) {
      throw new ProjectNotFoundError();
    }
    return environment;
  }

  private async validateServiceDefinition(serviceId: string): Promise<CatalogItem> {
    const service = (await this.catalog.listItems()).find((item) => item.id === serviceId);
    if (!service) {
      throw new ProjectValidationError('Unknown service definition.');
    }
    return service;
  }

  private validateConfiguration(service: CatalogItem, configuration: Readonly<Record<string, unknown>>): void {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
      throw new ProjectValidationError('Missing configuration.');
    }
    const required = Array.isArray(service.schema['required']) ? service.schema['required'] : [];
    for (const key of required) {
      if (typeof key === 'string' && (configuration[key] === undefined || configuration[key] === null || configuration[key] === '')) {
        throw new ProjectValidationError(`Missing configuration value: ${key}.`);
      }
    }
    const additionalProperties = service.schema['additionalProperties'];
    const properties = service.schema['properties'];
    if (additionalProperties === false && properties && typeof properties === 'object' && !Array.isArray(properties)) {
      const allowed = new Set(Object.keys(properties));
      for (const key of Object.keys(configuration)) {
        if (!allowed.has(key)) {
          throw new ProjectValidationError(`Unknown configuration value: ${key}.`);
        }
      }
    }
  }

  private createInstallationPlan(environment: Environment, serviceDefinition: CatalogItem, configuration: Readonly<Record<string, unknown>>): InstallationPlan {
    return {
      serviceDefinition,
      environment,
      variables: configuration,
      volumes: serviceDefinition.metadata.volumes ?? [],
      networks: [],
      ports: serviceDefinition.metadata.ports ?? []
    };
  }

  private assertTransition(from: InstalledServiceStatus, to: InstalledServiceStatus): void {
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw new ProjectValidationError(`Invalid service status transition from ${from} to ${to}.`);
    }
  }

  private async updateStatus(id: string, status: InstalledServiceStatus, runtime: Readonly<Record<string, unknown>> | null | undefined): Promise<InstalledService> {
    const service = await this.installedServices.updateStatus(id, status, runtime);
    if (!service) {
      throw new ProjectNotFoundError();
    }
    return service;
  }
}
