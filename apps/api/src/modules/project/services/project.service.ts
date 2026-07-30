import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectManager, ProjectNotFoundError, ProjectValidationError } from '@kiban/core';
import type { CreateEnvironmentDto, CreateProjectDto, EnvironmentDto, ProjectDetailsDto, ProjectSummaryDto, UpdateProjectDto } from '../dto/project.dto';
import { PROJECT_MANAGER } from '../interfaces/project.constants';
import { mapEnvironmentToDto, mapProjectDetailsToDto, mapProjectSummaryToDto } from '../mappers/project.mapper';

@Injectable()
export class ProjectService {
  public constructor(@Inject(PROJECT_MANAGER) private readonly projects: ProjectManager) {}

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

  /** Deletes a project. */
  public async delete(id: string): Promise<void> {
    try {
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
