import type { PluginDto } from '../dto/plugin.dto';
import type { PluginEntity } from '../entities/plugin.entity';

/** Maps plugin entities to API DTOs. */
export const mapPluginEntityToDto = (entity: PluginEntity): PluginDto => ({ id: entity.id });
