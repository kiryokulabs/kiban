import type { CatalogDto } from '../dto/catalog.dto';
import type { CatalogEntity } from '../entities/catalog.entity';

/** Maps catalog entities to API DTOs. */
export const mapCatalogEntityToDto = (entity: CatalogEntity): CatalogDto => ({ id: entity.id });
