import type { ProjectId } from '@kiban/shared';

export interface Project { readonly id: ProjectId; readonly name: string; readonly description?: string; readonly createdAt: Date; readonly updatedAt: Date; }
export interface CreateProjectInput { readonly name: string; readonly description?: string; }
