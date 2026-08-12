export type EnvironmentType = 'system' | 'custom';

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Environment {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: EnvironmentType;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProjectDetails {
  readonly project: Project;
  readonly environments: readonly Environment[];
}

export type ProjectHealthStatus = 'empty' | 'healthy' | 'degraded';

export interface ProjectSummary {
  readonly project: Project;
  readonly environmentCount: number;
  readonly serviceCount: number;
  readonly runningServiceCount: number;
  readonly healthStatus: ProjectHealthStatus;
}

export interface CreateProjectInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdateProjectInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface CreateEnvironmentInput {
  readonly name: string;
  readonly description?: string | null;
}
