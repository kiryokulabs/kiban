import type { HealthDto } from '../dto/health.dto';
import type { HealthEntity } from '../entities/health.entity';

/** Maps health entities to API DTOs. */
export const mapHealthEntityToDto = (entity: HealthEntity): HealthDto => ({ id: entity.id });
