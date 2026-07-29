import type { ServiceDto } from '../dto/service.dto';
import type { ServiceEntity } from '../entities/service.entity';

/** Maps service entities to API DTOs. */
export const mapServiceEntityToDto = (entity: ServiceEntity): ServiceDto => ({ id: entity.id });
