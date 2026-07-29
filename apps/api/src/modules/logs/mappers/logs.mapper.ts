import type { LogsDto } from '../dto/logs.dto';
import type { LogsEntity } from '../entities/logs.entity';

/** Maps logs entities to API DTOs. */
export const mapLogsEntityToDto = (entity: LogsEntity): LogsDto => ({ id: entity.id });
