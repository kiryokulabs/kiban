import type { CreateProjectInput, Project } from '../../domain/projects/project.js';
import type { ProjectId } from '@kiban/shared';

export interface ProjectRepository { create(input: CreateProjectInput): Promise<Project>; findById(id: ProjectId): Promise<Project | null>; list(): Promise<readonly Project[]>; }
