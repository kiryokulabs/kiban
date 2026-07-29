import type { ProjectDto } from '../dto/project.dto';
import type { ProjectEntity } from '../entities/project.entity';

/** Maps project entities to API DTOs. */
export const mapProjectEntityToDto = (entity: ProjectEntity): ProjectDto => ({ id: entity.id });
