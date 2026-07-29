import type { DockerDto } from '../dto/docker.dto';
import type { DockerEntity } from '../entities/docker.entity';

/** Maps docker entities to API DTOs. */
export const mapDockerEntityToDto = (entity: DockerEntity): DockerDto => ({ id: entity.id });
