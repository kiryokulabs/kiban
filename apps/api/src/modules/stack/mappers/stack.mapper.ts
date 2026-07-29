import type { StackDto } from '../dto/stack.dto';
import type { StackEntity } from '../entities/stack.entity';

/** Maps stack entities to API DTOs. */
export const mapStackEntityToDto = (entity: StackEntity): StackDto => ({ id: entity.id });
