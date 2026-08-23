import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InstalledServiceManager, ProjectNotFoundError, ProjectValidationError } from '@kiban/core';
import type { InstalledService, RuntimeProvider, RuntimePublicEndpoint, ServiceDefinition } from '@kiban/core';
import { CatalogService } from '../../catalog/services/catalog.service';
import { SqliteEnvironmentRepository } from '../../project/repositories/sqlite-environment.repository';
import { SqliteProjectRepository } from '../../project/repositories/sqlite-project.repository';
import type { InstallServiceDto, InstalledServiceDto, InstalledServiceLocationDto } from '../dto/service.dto';
import type { ServiceLogsDto, ServiceRuntimeDto } from '../dto/runtime.dto';
import type { InstalledServiceDetailsDto } from '../dto/service-details.dto';
import { INSTALLED_SERVICE_MANAGER, RUNTIME_PROVIDER } from '../interfaces/service.constants';
import { computeAccessPoints, mapInstalledServiceToDto } from '../mappers/service.mapper';
import { mapInstalledServiceDetails } from '../mappers/service-details.mapper';

@Injectable()
export class ServiceService {
  private catalogMap: Map<string, ServiceDefinition> | null = null;

  public constructor(
    @Inject(INSTALLED_SERVICE_MANAGER) private readonly services: InstalledServiceManager,
    @Inject(RUNTIME_PROVIDER) private readonly runtime: RuntimeProvider,
    private readonly catalog: CatalogService,
    private readonly environments: SqliteEnvironmentRepository,
    private readonly projects: SqliteProjectRepository
  ) {}

  /** Lists every installed service. */
  public async listAll(): Promise<readonly InstalledServiceDto[]> {
    try {
      const items = await this.services.listAll();
      return this.enrichAll(items);
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Lists services installed in an environment. */
  public async list(projectId: string, environmentId: string): Promise<readonly InstalledServiceDto[]> {
    try {
      const items = await this.services.listByEnvironment(projectId, environmentId);
      return this.enrichAll(items);
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Installs a catalog service in an environment. */
  public async install(projectId: string, environmentId: string, payload: unknown): Promise<InstalledServiceDto> {
    const dto = this.parseInstallPayload(payload);
    try {
      const installed = await this.services.install(projectId, environmentId, dto);
      return await this.enrichOne(installed);
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Gets one installed service. */
  public async get(id: string): Promise<InstalledServiceDto> {
    try {
      const installed = await this.services.get(id);
      return await this.enrichOne(installed);
    } catch (error: unknown) { this.mapError(error); }
  }


  /** Gets the full management details for one installed service. */
  public async details(id: string): Promise<InstalledServiceDetailsDto> {
    try {
      const installed = await this.services.get(id);
      const refreshed = this.runtime.refresh ? await this.runtime.refresh(installed) : null;
      const current = refreshed?.runtime ? { ...installed, status: refreshed.status, runtime: refreshed.runtime } : installed;
      const definition = await this.findServiceDefinition(installed.serviceId);
      const logs = this.runtime.getLogs ? await this.runtime.getLogs(current) : '';
      const location = await this.findLocation(installed.environmentId);
      return mapInstalledServiceDetails(current, definition, logs, location);
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Saves configuration and recreates runtime resources when the runtime requires it. */
  public async updateConfiguration(id: string, payload: unknown): Promise<InstalledServiceDto> {
    const configuration = this.parseConfigurationPayload(payload);
    try { return await this.enrichOne(await this.services.updateConfiguration(id, configuration)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Updates the public domain used to access one installed service. */
  public async updateDomain(id: string, payload: unknown): Promise<InstalledServiceDto> {
    const host = this.parseDomainPayload(payload);
    try {
      const service = await this.services.get(id);
      const endpoints = this.runtimePublicEndpoints(service.runtime);
      if (endpoints.length === 0) throw new ProjectValidationError('This service does not expose a web endpoint.');
      if (!this.runtime.updatePublicEndpoints) throw new ProjectValidationError('The current runtime cannot update service domains.');
      const updatedEndpoints = endpoints.map((endpoint) => ({ ...endpoint, host, url: `${endpoint.protocol}://${host}` }));
      const result = await this.runtime.updatePublicEndpoints(service, updatedEndpoints);
      const updated = await this.services.updateRuntime(id, result.runtime ?? { ...(service.runtime ?? {}), publicEndpoints: updatedEndpoints });
      return await this.enrichOne(updated);
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Recreates runtime resources using current configuration. */
  public async recreate(id: string): Promise<InstalledServiceDto> {
    try { return await this.enrichOne(await this.services.recreate(id)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Returns runtime metadata for an installed service. */
  public async runtimeMetadata(id: string): Promise<ServiceRuntimeDto> {
    try { return { runtime: (await this.services.get(id)).runtime }; } catch (error: unknown) { this.mapError(error); }
  }

  /** Returns recent runtime logs for an installed service. */
  public async logs(id: string): Promise<ServiceLogsDto> {
    try {
      const service = await this.services.get(id);
      return { logs: this.runtime.getLogs ? await this.runtime.getLogs(service) : '' };
    } catch (error: unknown) { this.mapError(error); }
  }

  /** Removes one installed service record. */
  public async delete(id: string): Promise<void> {
    try { await this.services.delete(id); } catch (error: unknown) { this.mapError(error); }
  }

  /** Starts an installed service. */
  public async start(id: string): Promise<InstalledServiceDto> {
    try { return await this.enrichOne(await this.services.start(id)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Stops an installed service. */
  public async stop(id: string): Promise<InstalledServiceDto> {
    try { return await this.enrichOne(await this.services.stop(id)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Restarts an installed service. */
  public async restart(id: string): Promise<InstalledServiceDto> {
    try { return await this.enrichOne(await this.services.restart(id)); } catch (error: unknown) { this.mapError(error); }
  }

  private async loadCatalogMap(): Promise<Map<string, ServiceDefinition>> {
    if (this.catalogMap) return this.catalogMap;
    const items = await this.catalog.listServiceDefinitions();
    this.catalogMap = new Map(items.map((item) => [item.id, item]));
    return this.catalogMap;
  }

  private async enrichOne(service: InstalledService): Promise<InstalledServiceDto> {
    const all = await this.enrichAll([service]);
    return all[0]!;
  }

  private async enrichAll(services: readonly InstalledService[]): Promise<readonly InstalledServiceDto[]> {
    let catalogMap: Map<string, ServiceDefinition> | undefined;
    try { catalogMap = await this.loadCatalogMap(); } catch { /* catalog unavailable, return without access points */ }
    const refreshedServices = await this.refreshRuntimeState(services);
    const locationMap = await this.loadLocationMap(refreshedServices);
    return refreshedServices.map((service) => {
      const dto = mapInstalledServiceToDto(service);
      const location = locationMap.get(service.environmentId);
      const base = location ? { ...dto, location } : dto;
      if (catalogMap) {
        const definition = catalogMap.get(service.serviceId);
        if (definition) {
          const enriched = { ...base, icon: definition.icon, description: definition.metadata.description };
          const accessPoints = computeAccessPoints(definition.metadata.accessPoints, service.configuration, service.runtime);
          if (accessPoints) {
            return { ...enriched, accessPoints } as InstalledServiceDto;
          }
          return enriched as InstalledServiceDto;
        }
      }
      return base;
    });
  }

  private async refreshRuntimeState(services: readonly InstalledService[]): Promise<readonly InstalledService[]> {
    if (!this.runtime.refresh) return services;
    return Promise.all(services.map(async (service) => {
      try {
        const refreshed = await this.runtime.refresh!(service);
        return refreshed.runtime ? { ...service, status: refreshed.status, runtime: refreshed.runtime } : service;
      } catch {
        return service;
      }
    }));
  }

  private async loadLocationMap(services: readonly InstalledService[]): Promise<Map<string, InstalledServiceLocationDto>> {
    const result = new Map<string, InstalledServiceLocationDto>();
    const environmentIds = [...new Set(services.map((service) => service.environmentId))];
    await Promise.all(environmentIds.map(async (environmentId) => {
      const environment = await this.environments.findById(environmentId);
      if (!environment) return;
      const project = await this.projects.findById(environment.projectId);
      if (!project) return;
      result.set(environmentId, {
        project: { id: project.id, name: project.name },
        environment: { id: environment.id, name: environment.name, type: environment.type }
      });
    }));
    return result;
  }


  private async findLocation(environmentId: string): Promise<import('../dto/service-details.dto').ServiceLocationDto> {
    const environment = await this.environments.findById(environmentId);
    if (!environment) throw new ProjectNotFoundError();
    const project = await this.projects.findById(environment.projectId);
    if (!project) throw new ProjectNotFoundError();
    return {
      project: { id: project.id, name: project.name },
      environment: { id: environment.id, name: environment.name, type: environment.type }
    };
  }

  private async findServiceDefinition(serviceId: string): Promise<import('@kiban/core').ServiceDefinition> {
    const definition = (await this.catalog.listServiceDefinitions()).find((item) => item.id === serviceId);
    if (!definition) throw new ProjectValidationError('Unknown service definition.');
    return definition;
  }

  private parseConfigurationPayload(payload: unknown): Readonly<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Invalid configuration payload.');
    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== 'configuration') throw new BadRequestException('Invalid configuration payload.');
    const configuration = record['configuration'];
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new BadRequestException('Invalid configuration payload.');
    return configuration as Readonly<Record<string, unknown>>;
  }

  private parseDomainPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Invalid service domain payload.');
    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== 'host' || typeof record['host'] !== 'string') throw new BadRequestException('Invalid service domain payload.');
    const host = record['host'].trim();
    if (host.length === 0) throw new BadRequestException('Service domain is required.');
    if (host.includes('://') || host.includes('/') || /\s/.test(host)) throw new BadRequestException('Service domain must be a hostname without protocol or path.');
    return host;
  }

  private runtimePublicEndpoints(runtime: Readonly<Record<string, unknown>> | null): readonly RuntimePublicEndpoint[] {
    const publicEndpoints = runtime?.['publicEndpoints'];
    if (!Array.isArray(publicEndpoints)) return [];
    return publicEndpoints.flatMap((endpoint) => {
      if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) return [];
      const record = endpoint as Readonly<Record<string, unknown>>;
      const name = record['name'];
      const service = record['service'];
      const port = record['port'];
      const host = record['host'];
      const url = record['url'];
      const protocol = this.endpointProtocol(record['protocol'], url);
      if (typeof name !== 'string' || typeof service !== 'string' || typeof port !== 'number' || typeof host !== 'string' || typeof url !== 'string') return [];
      return [{ name, service, port, host, url, protocol }];
    });
  }

  private endpointProtocol(protocol: unknown, url: unknown): 'http' | 'https' {
    if (protocol === 'http' || protocol === 'https') return protocol;
    if (typeof url === 'string' && url.startsWith('https://')) return 'https';
    return 'http';
  }

  private parseInstallPayload(payload: unknown): InstallServiceDto {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Invalid install payload.');
    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    const allowed = new Set(['serviceId', 'configuration']);
    if (keys.some((key) => !allowed.has(key)) || typeof record['serviceId'] !== 'string') throw new BadRequestException('Invalid install payload.');
    const configuration = record['configuration'];
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new BadRequestException('Invalid install payload.');
    return { serviceId: record['serviceId'], configuration: configuration as Readonly<Record<string, unknown>> };
  }

  private mapError(error: unknown): never {
    if (error instanceof ProjectValidationError) throw new BadRequestException(error.message);
    if (error instanceof ProjectNotFoundError) throw new NotFoundException(error.message);
    throw error;
  }
}
