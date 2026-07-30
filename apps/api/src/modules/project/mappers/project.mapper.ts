import type { Environment, ProjectDetails, ProjectSummary } from '@kiban/core';
import type { EnvironmentDto, ProjectDetailsDto, ProjectSummaryDto } from '../dto/project.dto';

/** Maps an environment into its API representation. */
export const mapEnvironmentToDto = (environment: Environment): EnvironmentDto => ({
  id: environment.id,
  projectId: environment.projectId,
  name: environment.name,
  slug: environment.slug,
  type: environment.type,
  description: environment.description,
  status: 'Empty',
  createdAt: environment.createdAt.toISOString(),
  updatedAt: environment.updatedAt.toISOString()
});

/** Maps project details into an API DTO. */
export const mapProjectDetailsToDto = (details: ProjectDetails): ProjectDetailsDto => ({
  id: details.project.id,
  name: details.project.name,
  description: details.project.description,
  createdAt: details.project.createdAt.toISOString(),
  updatedAt: details.project.updatedAt.toISOString(),
  environments: details.environments.map(mapEnvironmentToDto)
});

/** Maps a project summary into an API DTO. */
export const mapProjectSummaryToDto = (summary: ProjectSummary): ProjectSummaryDto => ({
  id: summary.project.id,
  name: summary.project.name,
  description: summary.project.description,
  environmentCount: summary.environmentCount,
  createdAt: summary.project.createdAt.toISOString(),
  updatedAt: summary.project.updatedAt.toISOString()
});
