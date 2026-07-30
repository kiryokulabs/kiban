import { describe, expect, it, vi } from 'vitest';
import type { Environment, Project, ProjectSummary } from '../../domain/projects/project.js';
import { ProjectNotFoundError, ProjectValidationError } from '../../domain/projects/project-errors.js';
import type { EnvironmentRepository, ProjectRepository, ProjectTransaction, ProjectUnitOfWork } from '../interfaces/project-repository.js';
import { ProjectManager } from './project-manager.js';

const now = new Date('2026-07-29T12:00:00.000Z');

class MemoryProjectRepository implements ProjectRepository {
  public readonly projects = new Map<string, Project>();
  private nextId = 1;

  public async create(input: { readonly name: string; readonly description: string | null }): Promise<Project> {
    const project: Project = { id: `project-${this.nextId}`, name: input.name, description: input.description, createdAt: now, updatedAt: now };
    this.nextId += 1;
    this.projects.set(project.id, project);
    return project;
  }

  public async findById(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  public async list(): Promise<readonly ProjectSummary[]> {
    return [...this.projects.values()].map((project) => ({ project, environmentCount: 3 }));
  }

  public async update(id: string, input: { readonly name: string; readonly description: string | null }): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;
    const project = { ...existing, ...input, updatedAt: now };
    this.projects.set(id, project);
    return project;
  }

  public async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

class MemoryEnvironmentRepository implements EnvironmentRepository {
  public readonly environments = new Map<string, Environment>();
  private nextId = 1;
  public failOnName: string | null = null;

  public async create(input: { readonly projectId: string; readonly name: string; readonly slug: string; readonly type: 'system' | 'custom'; readonly description: string | null }): Promise<Environment> {
    if (input.name === this.failOnName) {
      throw new Error('Environment creation failed');
    }
    const environment: Environment = { id: `environment-${this.nextId}`, projectId: input.projectId, name: input.name, slug: input.slug, type: input.type, description: input.description, createdAt: now, updatedAt: now };
    this.nextId += 1;
    this.environments.set(environment.id, environment);
    return environment;
  }

  public async listByProjectId(projectId: string): Promise<readonly Environment[]> {
    return [...this.environments.values()].filter((environment) => environment.projectId === projectId);
  }

  public async findById(id: string): Promise<Environment | null> {
    return this.environments.get(id) ?? null;
  }

  public async deleteById(id: string): Promise<void> {
    this.environments.delete(id);
  }

  public async deleteByProjectId(projectId: string): Promise<void> {
    for (const environment of [...this.environments.values()]) {
      if (environment.projectId === projectId) {
        this.environments.delete(environment.id);
      }
    }
  }
}

class MemoryUnitOfWork implements ProjectUnitOfWork {
  public constructor(private readonly projects: MemoryProjectRepository, private readonly environments: MemoryEnvironmentRepository) {}

  public async transaction<T>(operation: (transaction: ProjectTransaction) => Promise<T>): Promise<T> {
    const projectSnapshot = new Map(this.projects.projects);
    const environmentSnapshot = new Map(this.environments.environments);
    try {
      return await operation({ projects: this.projects, environments: this.environments });
    } catch (error) {
      this.projects.projects.clear();
      for (const [key, value] of projectSnapshot) this.projects.projects.set(key, value);
      this.environments.environments.clear();
      for (const [key, value] of environmentSnapshot) this.environments.environments.set(key, value);
      throw error;
    }
  }
}

const createManager = () => {
  const projects = new MemoryProjectRepository();
  const environments = new MemoryEnvironmentRepository();
  const unitOfWork = new MemoryUnitOfWork(projects, environments);
  const manager = new ProjectManager(projects, environments, unitOfWork);
  return { manager, projects, environments };
};

describe('ProjectManager', () => {
  it('creates a project with the three system environments atomically', async () => {
    const { manager } = createManager();

    const details = await manager.createProject({ name: 'CrossMetrics', description: 'Analytics platform' });

    expect(details.project).toMatchObject({ id: 'project-1', name: 'CrossMetrics', description: 'Analytics platform' });
    expect(details.environments.map((environment) => ({ name: environment.name, slug: environment.slug, type: environment.type, description: environment.description }))).toEqual([
      { name: 'Development', slug: 'development', type: 'system', description: null },
      { name: 'Staging', slug: 'staging', type: 'system', description: null },
      { name: 'Production', slug: 'production', type: 'system', description: null }
    ]);
  });

  it('rolls back project creation when any default environment fails', async () => {
    const { manager, projects, environments } = createManager();
    environments.failOnName = 'Staging';

    await expect(manager.createProject({ name: 'CrossMetrics', description: null })).rejects.toThrow('Environment creation failed');

    expect(await projects.findById('project-1')).toBeNull();
    expect(await environments.listByProjectId('project-1')).toEqual([]);
  });

  it('rejects empty project names', async () => {
    const { manager } = createManager();
    await expect(manager.createProject({ name: '   ', description: null })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('rejects project names longer than 100 characters', async () => {
    const { manager } = createManager();
    await expect(manager.createProject({ name: 'a'.repeat(101), description: null })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('lists projects with environment counts', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    await expect(manager.listProjects()).resolves.toMatchObject([
      { project: { id: 'project-1', name: 'CrossMetrics' }, environmentCount: 3 }
    ]);
  });

  it('gets one project including environments', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    const details = await manager.getProject('project-1');

    expect(details.environments).toHaveLength(3);
    expect(details.project.name).toBe('CrossMetrics');
  });

  it('throws when getting a missing project', async () => {
    const { manager } = createManager();
    await expect(manager.getProject('missing')).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('updates project name and description', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'Old', description: null });

    await expect(manager.updateProject('project-1', { name: 'New', description: 'Updated' })).resolves.toMatchObject({ project: { name: 'New', description: 'Updated' } });
  });

  it('deletes a project and cascades environment deletion', async () => {
    const { manager, environments } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    await manager.deleteProject('project-1');

    await expect(environments.listByProjectId('project-1')).resolves.toEqual([]);
  });

  it('returns environments for a project', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    await expect(manager.listEnvironments('project-1')).resolves.toHaveLength(3);
  });

  it('creates a custom environment for a project', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    const environment = await manager.createEnvironment('project-1', { name: 'QA', description: 'Quality checks' });

    expect(environment).toMatchObject({ projectId: 'project-1', name: 'QA', slug: 'qa', type: 'custom', description: 'Quality checks' });
    await expect(manager.listEnvironments('project-1')).resolves.toHaveLength(4);
  });

  it('rejects empty custom environment names', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });

    await expect(manager.createEnvironment('project-1', { name: '   ' })).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it('deletes a custom environment', async () => {
    const { manager } = createManager();
    await manager.createProject({ name: 'CrossMetrics', description: null });
    const environment = await manager.createEnvironment('project-1', { name: 'QA' });

    await manager.deleteEnvironment('project-1', environment.id);

    await expect(manager.listEnvironments('project-1')).resolves.toHaveLength(3);
  });

  it('does not delete system environments', async () => {
    const { manager } = createManager();
    const details = await manager.createProject({ name: 'CrossMetrics', description: null });
    const systemEnvironment = details.environments[0]!;

    await expect(manager.deleteEnvironment('project-1', systemEnvironment.id)).rejects.toBeInstanceOf(ProjectValidationError);
  });

});
