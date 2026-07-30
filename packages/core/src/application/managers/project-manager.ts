import { ProjectNotFoundError, ProjectValidationError } from '../../domain/projects/project-errors.js';
import type { CreateEnvironmentInput, CreateProjectInput, Environment, ProjectDetails, ProjectSummary, UpdateProjectInput } from '../../domain/projects/project.js';
import type { EnvironmentRepository, ProjectRepository, ProjectUnitOfWork } from '../interfaces/project-repository.js';

const MAX_PROJECT_NAME_LENGTH = 100;
const DEFAULT_ENVIRONMENTS = [
  { name: 'Development', slug: 'development' },
  { name: 'Staging', slug: 'staging' },
  { name: 'Production', slug: 'production' }
] as const;

/** Coordinates project and environment use cases without knowing persistence or presentation details. */
export class ProjectManager {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly environments: EnvironmentRepository,
    private readonly unitOfWork: ProjectUnitOfWork
  ) {}

  /** Creates a project and its three system environments atomically. */
  public async createProject(input: CreateProjectInput): Promise<ProjectDetails> {
    const normalized = this.validateProjectInput(input);
    return this.unitOfWork.transaction(async (transaction) => {
      const project = await transaction.projects.create(normalized);
      const environments = [];
      for (const environment of DEFAULT_ENVIRONMENTS) {
        environments.push(await transaction.environments.create({ projectId: project.id, name: environment.name, slug: environment.slug, type: 'system', description: null }));
      }
      return { project, environments };
    });
  }

  /** Lists project summaries including environment counts. */
  public listProjects(): Promise<readonly ProjectSummary[]> {
    return this.projects.list();
  }

  /** Gets a project including all environments. */
  public async getProject(id: string): Promise<ProjectDetails> {
    const project = await this.projects.findById(id);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    const environments = await this.environments.listByProjectId(project.id);
    return { project, environments };
  }

  /** Updates editable project fields. */
  public async updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetails> {
    const normalized = this.validateProjectInput(input);
    const project = await this.projects.update(id, normalized);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    const environments = await this.environments.listByProjectId(project.id);
    return { project, environments };
  }

  /** Deletes a project and cascades environment deletion. */
  public async deleteProject(id: string): Promise<void> {
    const project = await this.projects.findById(id);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    await this.unitOfWork.transaction(async (transaction) => {
      await transaction.environments.deleteByProjectId(id);
      await transaction.projects.delete(id);
    });
  }

  /** Lists environments for a project. */
  public async listEnvironments(projectId: string): Promise<readonly Environment[]> {
    const project = await this.projects.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    return this.environments.listByProjectId(project.id);
  }


  /** Creates a custom environment for a project. */
  public async createEnvironment(projectId: string, input: CreateEnvironmentInput): Promise<Environment> {
    const project = await this.projects.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    const name = this.validateEnvironmentName(input.name);
    const description = input.description?.trim() || null;
    return this.environments.create({ projectId: project.id, name, slug: this.slugify(name), type: 'custom', description });
  }

  /** Deletes a custom environment. System environments cannot be deleted. */
  public async deleteEnvironment(projectId: string, environmentId: string): Promise<void> {
    const project = await this.projects.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }
    const environment = await this.environments.findById(environmentId);
    if (!environment || environment.projectId !== project.id) {
      throw new ProjectNotFoundError();
    }
    if (environment.type === 'system') {
      throw new ProjectValidationError('System environments cannot be deleted.');
    }
    await this.environments.deleteById(environment.id);
  }


  private validateEnvironmentName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new ProjectValidationError('Environment name cannot be empty.');
    }
    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      throw new ProjectValidationError('Environment name cannot be longer than 100 characters.');
    }
    return name;
  }

  private slugify(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private validateProjectInput(input: CreateProjectInput | UpdateProjectInput): { readonly name: string; readonly description: string | null } {
    const name = input.name.trim();
    if (!name) {
      throw new ProjectValidationError('Project name cannot be empty.');
    }
    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      throw new ProjectValidationError('Project name cannot be longer than 100 characters.');
    }
    const description = input.description?.trim() || null;
    return { name, description };
  }
}
