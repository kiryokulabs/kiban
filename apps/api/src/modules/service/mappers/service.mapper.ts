import type { InstalledService } from '@kiban/core';
import type { InstalledServiceDto } from '../dto/service.dto';

/** Maps an installed service to its API DTO. */
export const mapInstalledServiceToDto = (service: InstalledService): InstalledServiceDto => ({
  id: service.id,
  environmentId: service.environmentId,
  serviceId: service.serviceId,
  name: service.name,
  status: service.status,
  configuration: service.configuration,
  runtime: service.runtime,
  createdAt: service.createdAt.toISOString(),
  updatedAt: service.updatedAt.toISOString()
});
