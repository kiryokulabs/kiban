import type { CreateProjectInput, Project } from '../../domain/projects/project.js';
import type { ProjectRepository } from '../interfaces/project-repository.js';

/** Coordinates project use cases without knowing persistence or presentation details. */
export class ProjectManager {
  public constructor(private readonly projects: ProjectRepository) {}

  /** Creates a project through the configured repository port. */
  public createProject(input: CreateProjectInput): Promise<Project> { return this.projects.create(input); }

  /** Lists all projects visible to the current installation. */
  public listProjects(): Promise<readonly Project[]> { return this.projects.list(); }
}
