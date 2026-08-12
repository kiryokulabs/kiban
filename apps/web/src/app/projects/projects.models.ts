export type EnvironmentType = 'system' | 'custom';

export interface EnvironmentItem {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: EnvironmentType;
  readonly description: string | null;
  readonly status: 'Empty';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly environmentCount: number;
  readonly serviceCount: number;
  readonly runningServiceCount: number;
  readonly healthStatus: 'empty' | 'healthy' | 'degraded';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectDetails {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly environments: readonly EnvironmentItem[];
}

export interface CreateProjectRequest { readonly name: string; readonly description?: string | null; }
export interface UpdateProjectRequest { readonly name: string; readonly description?: string | null; }
export interface CreateEnvironmentRequest { readonly name: string; readonly description?: string | null; }
