import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InstalledServiceManager, ProjectNotFoundError, ProjectValidationError, type RuntimeProvider } from '@kiban/core';
import type { InstallServiceDto, InstalledServiceDto } from '../dto/service.dto';
import type { ServiceLogsDto, ServiceRuntimeDto } from '../dto/runtime.dto';
import { INSTALLED_SERVICE_MANAGER, RUNTIME_PROVIDER } from '../interfaces/service.constants';
import { mapInstalledServiceToDto } from '../mappers/service.mapper';

@Injectable()
export class ServiceService {
  public constructor(@Inject(INSTALLED_SERVICE_MANAGER) private readonly services: InstalledServiceManager, @Inject(RUNTIME_PROVIDER) private readonly runtime: RuntimeProvider) {}

  /** Lists every installed service. */
  public async listAll(): Promise<readonly InstalledServiceDto[]> {
    try { return (await this.services.listAll()).map(mapInstalledServiceToDto); } catch (error: unknown) { this.mapError(error); }
  }

  /** Lists services installed in an environment. */
  public async list(projectId: string, environmentId: string): Promise<readonly InstalledServiceDto[]> {
    try { return (await this.services.listByEnvironment(projectId, environmentId)).map(mapInstalledServiceToDto); } catch (error: unknown) { this.mapError(error); }
  }

  /** Installs a catalog service in an environment. */
  public async install(projectId: string, environmentId: string, payload: unknown): Promise<InstalledServiceDto> {
    const dto = this.parseInstallPayload(payload);
    try { return mapInstalledServiceToDto(await this.services.install(projectId, environmentId, dto)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Gets one installed service. */
  public async get(id: string): Promise<InstalledServiceDto> {
    try { return mapInstalledServiceToDto(await this.services.get(id)); } catch (error: unknown) { this.mapError(error); }
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
    try { return mapInstalledServiceToDto(await this.services.start(id)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Stops an installed service. */
  public async stop(id: string): Promise<InstalledServiceDto> {
    try { return mapInstalledServiceToDto(await this.services.stop(id)); } catch (error: unknown) { this.mapError(error); }
  }

  /** Restarts an installed service. */
  public async restart(id: string): Promise<InstalledServiceDto> {
    try { return mapInstalledServiceToDto(await this.services.restart(id)); } catch (error: unknown) { this.mapError(error); }
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
