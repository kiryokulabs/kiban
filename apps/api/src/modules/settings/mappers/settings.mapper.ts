import type { SettingsDto } from '../dto/settings.dto';
import type { SettingsEntity } from '../entities/settings.entity';

/** Maps settings entities to API DTOs. */
export const mapSettingsEntityToDto = (entity: SettingsEntity): SettingsDto => ({ id: entity.id });
