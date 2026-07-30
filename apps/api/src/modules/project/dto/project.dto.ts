export interface CreateEnvironmentDto { readonly name: string; readonly description?: string | null; }
export interface CreateProjectDto { readonly name: string; readonly description?: string | null; }
export interface UpdateProjectDto { readonly name: string; readonly description?: string | null; }
export interface EnvironmentDto { readonly id: string; readonly projectId: string; readonly name: string; readonly slug: string; readonly type: 'system' | 'custom'; readonly description: string | null; readonly status: 'Empty'; readonly createdAt: string; readonly updatedAt: string; }
export interface ProjectSummaryDto { readonly id: string; readonly name: string; readonly description: string | null; readonly environmentCount: number; readonly serviceCount: number; readonly runningServiceCount: number; readonly healthStatus: 'empty' | 'healthy' | 'degraded'; readonly createdAt: string; readonly updatedAt: string; }
export interface ProjectDetailsDto { readonly id: string; readonly name: string; readonly description: string | null; readonly createdAt: string; readonly updatedAt: string; readonly environments: readonly EnvironmentDto[]; }
