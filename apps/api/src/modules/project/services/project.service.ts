import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectManager, ProjectNotFoundError, ProjectValidationError } from '@kiban/core';
import type { CreateEnvironmentDto, CreateProjectDto, EnvironmentDto, ProjectDetailsDto, ProjectSettingsDto, ProjectSummaryDto, SaveProjectImageDto, UpdateProjectDto } from '../dto/project.dto';
import { PROJECT_MANAGER } from '../interfaces/project.constants';
import type { ProjectImageData, ProjectImageStorage } from '../interfaces/project-image-storage';
import { mapEnvironmentToDto, mapProjectDetailsToDto, mapProjectSummaryToDto } from '../mappers/project.mapper';

interface InstalledServicesForProjectDeletion {
  list(projectId: string, environmentId: string): Promise<readonly { readonly id: string }[]>;
}

@Injectable()
export class ProjectService {
  public constructor(
    @Inject(PROJECT_MANAGER) private readonly projects: ProjectManager,
    private readonly installedServices?: InstalledServicesForProjectDeletion,
    private readonly imageStorage?: ProjectImageStorage
  ) {}

  /** Lists project summaries. */
  public async list(): Promise<readonly ProjectSummaryDto[]> {
    const projects = await this.projects.listProjects();
    return projects.map(mapProjectSummaryToDto);
  }

  /** Gets one project with environments. */
  public async get(id: string): Promise<ProjectDetailsDto> {
    try {
      return mapProjectDetailsToDto(await this.projects.getProject(id));
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Creates a project with default system environments. */
  public async create(payload: unknown): Promise<ProjectDetailsDto> {
    const dto = this.parseCreate(payload);
    try {
      return mapProjectDetailsToDto(await this.projects.createProject(dto));
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Updates editable project fields. */
  public async update(id: string, payload: unknown): Promise<ProjectDetailsDto> {
    const dto = this.parseUpdate(payload);
    try {
      return mapProjectDetailsToDto(await this.projects.updateProject(id, dto));
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Gets editable settings and aggregate project information. */
  public async getSettings(id: string): Promise<ProjectSettingsDto> {
    try {
      const details = await this.projects.getProject(id);
      let serviceCount = 0;
      if (this.installedServices) {
        for (const environment of details.environments) {
          serviceCount += (await this.installedServices.list(id, environment.id)).length;
        }
      }
      const image = this.imageStorage ? await this.imageStorage.find(id) : null;
      return {
        id: details.project.id,
        name: details.project.name,
        description: details.project.description,
        createdAt: details.project.createdAt.toISOString(),
        updatedAt: details.project.updatedAt.toISOString(),
        environmentCount: details.environments.length,
        serviceCount,
        hasImage: image !== null
      };
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Stores the project image outside the database. */
  public async saveImage(id: string, payload: unknown): Promise<void> {
    if (!this.imageStorage) throw new Error('Project image storage is not configured.');
    const dto = this.parseImagePayload(payload);
    try {
      await this.projects.getProject(id);
      await this.imageStorage.save(id, { contentType: dto.contentType, data: Buffer.from(dto.dataBase64, 'base64') });
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Reads a project image from local storage. */
  public async getImage(id: string): Promise<ProjectImageData> {
    if (!this.imageStorage) throw new Error('Project image storage is not configured.');
    try {
      await this.projects.getProject(id);
      const image = await this.imageStorage.find(id);
      if (!image) throw new NotFoundException('Project image not found.');
      return image;
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Deletes a project only when none of its environments has installed services. */
  public async delete(id: string): Promise<void> {
    try {
      if (this.installedServices) {
        const details = await this.projects.getProject(id);
        for (const environment of details.environments) {
          const services = await this.installedServices.list(id, environment.id);
          if (services.length > 0) {
            throw new ProjectValidationError('Project must be empty before it can be deleted.');
          }
        }
      }
      await this.projects.deleteProject(id);
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Lists read-only environments for a project. */
  public async listEnvironments(projectId: string): Promise<readonly EnvironmentDto[]> {
    try {
      const environments = await this.projects.listEnvironments(projectId);
      return environments.map(mapEnvironmentToDto);
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Creates a custom environment for a project. */
  public async createEnvironment(projectId: string, payload: unknown): Promise<EnvironmentDto> {
    const dto = this.parseEnvironmentPayload(payload);
    try {
      return mapEnvironmentToDto(await this.projects.createEnvironment(projectId, dto));
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  /** Deletes a custom environment for a project. */
  public async deleteEnvironment(projectId: string, environmentId: string): Promise<void> {
    try {
      await this.projects.deleteEnvironment(projectId, environmentId);
    } catch (error: unknown) {
      this.mapProjectError(error);
    }
  }

  private parseCreate(payload: unknown): CreateProjectDto {
    return this.parseProjectPayload(payload);
  }

  private parseUpdate(payload: unknown): UpdateProjectDto {
    return this.parseProjectPayload(payload);
  }

  private parseProjectPayload(payload: unknown): CreateProjectDto {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid project payload.');
    }

    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    const allowedKeys = new Set(['name', 'description']);
    if (keys.some((key) => !allowedKeys.has(key)) || typeof record['name'] !== 'string') {
      throw new BadRequestException('Invalid project payload.');
    }

    const description = record['description'];
    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new BadRequestException('Invalid project payload.');
    }

    return { name: record['name'], description: description ?? null };
  }

  private parseEnvironmentPayload(payload: unknown): CreateEnvironmentDto {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid environment payload.');
    }
    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    const allowedKeys = new Set(['name', 'description']);
    if (keys.some((key) => !allowedKeys.has(key)) || typeof record['name'] !== 'string') {
      throw new BadRequestException('Invalid environment payload.');
    }
    const description = record['description'];
    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new BadRequestException('Invalid environment payload.');
    }
    return { name: record['name'], description: description ?? null };
  }

  private parseImagePayload(payload: unknown): SaveProjectImageDto {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid project image payload.');
    }
    const record = payload as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record);
    const allowedKeys = new Set(['contentType', 'dataBase64']);
    if (keys.some((key) => !allowedKeys.has(key)) || typeof record['contentType'] !== 'string' || typeof record['dataBase64'] !== 'string') {
      throw new BadRequestException('Invalid project image payload.');
    }
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
    if (!allowedTypes.has(record['contentType'])) {
      throw new BadRequestException('Unsupported project image type.');
    }
    const data = Buffer.from(record['dataBase64'], 'base64');
    if (data.length === 0 || data.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Invalid project image size.');
    }
    return { contentType: record['contentType'], dataBase64: record['dataBase64'] };
  }

  private mapProjectError(error: unknown): never {
    if (error instanceof ProjectValidationError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof ProjectNotFoundError) {
      throw new NotFoundException(error.message);
    }
    throw error;
  }
}
