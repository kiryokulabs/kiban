import type { Environment, EnvironmentType, Project, ProjectSummary } from '../../domain/projects/project.js';

export interface CreateProjectRecordInput { readonly name: string; readonly description: string | null; }
export interface UpdateProjectRecordInput { readonly name: string; readonly description: string | null; }
export interface CreateEnvironmentRecordInput { readonly projectId: string; readonly name: string; readonly slug: string; readonly type: EnvironmentType; readonly description: string | null; }

export interface ProjectRepository {
  /** Creates a project record. */
  create(input: CreateProjectRecordInput): Promise<Project>;
  /** Finds a project by identifier. */
  findById(id: string): Promise<Project | null>;
  /** Lists projects with their environment counts. */
  list(): Promise<readonly ProjectSummary[]>;
  /** Updates project editable fields. */
  update(id: string, input: UpdateProjectRecordInput): Promise<Project | null>;
  /** Deletes a project record. Returns true when a row was deleted. */
  delete(id: string): Promise<boolean>;
}

export interface EnvironmentRepository {
  /** Creates an environment record. */
  create(input: CreateEnvironmentRecordInput): Promise<Environment>;
  /** Lists environments belonging to a project. */
  listByProjectId(projectId: string): Promise<readonly Environment[]>;
  /** Finds an environment by identifier. */
  findById(id: string): Promise<Environment | null>;
  /** Deletes an environment by identifier. */
  deleteById(id: string): Promise<void>;
  /** Deletes every environment belonging to a project. */
  deleteByProjectId(projectId: string): Promise<void>;
}

export interface ProjectTransaction {
  readonly projects: ProjectRepository;
  readonly environments: EnvironmentRepository;
}

export interface ProjectUnitOfWork {
  /** Runs project and environment persistence in one atomic transaction. */
  transaction<T>(operation: (transaction: ProjectTransaction) => Promise<T>): Promise<T>;
}
