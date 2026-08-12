import type { InstalledService, ServiceDefinition } from '@kiban/core';
import type { InstalledServiceDetailsDto, RuntimeContainerDto, RuntimeErrorDto, RuntimePortDto, RuntimeVolumeDto, ServiceActivityItemDto, ServiceHealthDetailsDto, ServiceLocationDto } from '../dto/service-details.dto';
import { computeAccessPoints, mapInstalledServiceToDto } from './service.mapper';

const stringValue = (value: unknown, fallback: string): string => (typeof value === 'string' && value.length > 0 ? value : fallback);
const numberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};
const objectValue = (value: unknown): Readonly<Record<string, unknown>> | null => (!value || typeof value !== 'object' || Array.isArray(value) ? null : value as Readonly<Record<string, unknown>>);

/** Builds the complete service management DTO from generic service definition and runtime metadata. */
export function mapInstalledServiceDetails(service: InstalledService, definition: ServiceDefinition, logs: string, location: ServiceLocationDto): InstalledServiceDetailsDto {
  const runtime = service.runtime;
  const containers = runtimeContainers(runtime, definition);
  const accessPoints = computeAccessPoints(definition.metadata.accessPoints, service.configuration, runtime) ?? [];
  return {
    installedService: { ...mapInstalledServiceToDto(service), accessPoints },
    location,
    overview: {
      name: service.name,
      description: definition.metadata.description,
      icon: definition.icon,
      category: definition.metadata.category,
      status: service.status,
      health: runtimeHealth(runtime),
      installedVersion: installedVersion(runtime, definition),
      runtime: runtimeProvider(runtime),
      installedAt: service.createdAt.toISOString()
    },
    healthDetails: runtimeHealthDetails(runtime),
    activity: runtimeActivity(service, runtime),
    accessPoints,
    configuration: { schema: definition.schema, values: service.configuration },
    containers,
    volumes: runtimeVolumes(runtime, definition),
    networking: { assignedPorts: runtimePorts(runtime), networks: runtimeNetworks(runtime) },
    errors: runtimeErrors(runtime),
    logs: { value: logs, containers: containers.map((container) => container.name) }
  };
}

function runtimeHealthDetails(runtime: Readonly<Record<string, unknown>> | null): ServiceHealthDetailsDto {
  const status = runtimeHealth(runtime);
  return {
    status,
    source: runtime ? stringValue(runtime['healthSource'], 'runtime') : 'runtime',
    checkedAt: runtime ? stringValue(runtime['healthCheckedAt'], '') : '',
    message: runtime ? stringValue(runtime['healthMessage'], healthMessage(status)) : healthMessage(status)
  };
}

function healthMessage(status: string): string {
  if (status === 'healthy') return 'Service is reachable.';
  if (status === 'unhealthy') return 'Service is not healthy.';
  return 'Service health is unknown.';
}

function runtimeActivity(service: InstalledService, runtime: Readonly<Record<string, unknown>> | null): readonly ServiceActivityItemDto[] {
  const installed = service.createdAt.toISOString();
  const updated = service.updatedAt.toISOString();
  const checked = runtime ? stringValue(runtime['healthCheckedAt'], '') : '';
  return [
    { label: 'Installed', value: installed },
    { label: 'Last updated', value: updated },
    ...(checked ? [{ label: 'Health checked', value: checked }] : [])
  ];
}

function runtimeProvider(runtime: Readonly<Record<string, unknown>> | null): string {
  return runtime ? stringValue(runtime['provider'], 'unknown') : 'unknown';
}

function runtimeHealth(runtime: Readonly<Record<string, unknown>> | null): string {
  return runtime ? stringValue(runtime['health'], 'unknown') : 'unknown';
}

function installedVersion(runtime: Readonly<Record<string, unknown>> | null, definition: ServiceDefinition): string {
  const tag = runtime ? stringValue(runtime['imageTag'], '') : '';
  if (tag) return tag;
  return definition.runtime.services[0]?.tag ?? 'unknown';
}

function runtimeContainers(runtime: Readonly<Record<string, unknown>> | null, definition: ServiceDefinition): readonly RuntimeContainerDto[] {
  const containers = runtime?.['containers'];
  if (Array.isArray(containers)) {
    return containers.map((entry, index) => {
      const record = objectValue(entry) ?? {};
      const image = stringValue(record['image'], definition.runtime.services[index]?.image ?? 'unknown');
      return {
        id: stringValue(record['id'], stringValue(record['containerId'], 'unknown')),
        name: stringValue(record['name'], definition.runtime.services[index]?.name ?? `service-${index + 1}`),
        status: stringValue(record['status'], stringValue(runtime?.['status'], 'unknown')),
        health: stringValue(record['health'], stringValue(runtime?.['health'], 'unknown')),
        image,
        restartCount: numberValue(record['restartCount']) ?? 0
      };
    });
  }
  const containerId = runtime ? stringValue(runtime['containerId'], '') : '';
  if (!containerId) return [];
  const first = definition.runtime.services[0];
  return [{
    id: containerId,
    name: first?.name ?? serviceNameFromDefinition(definition),
    status: stringValue(runtime?.['status'], 'unknown'),
    health: stringValue(runtime?.['health'], 'unknown'),
    image: first ? `${first.image}:${first.tag}` : stringValue(runtime?.['image'], 'unknown'),
    restartCount: numberValue(runtime?.['restartCount']) ?? 0
  }];
}

function serviceNameFromDefinition(definition: ServiceDefinition): string {
  return definition.runtime.services[0]?.name ?? definition.id;
}

function runtimeVolumes(runtime: Readonly<Record<string, unknown>> | null, definition: ServiceDefinition): readonly RuntimeVolumeDto[] {
  const volumeIds = runtime?.['volumeIds'];
  const mountTargets = definition.runtime.services.flatMap((runtimeService) => runtimeService.volumes.map((volume) => volume.target));
  if (Array.isArray(volumeIds)) {
    return volumeIds.map((value, index) => ({ name: stringValue(value, `volume-${index + 1}`), mountPath: mountTargets[index] ?? 'managed' }));
  }
  return definition.runtime.services.flatMap((runtimeService) => runtimeService.volumes.map((volume) => ({ name: volume.name ?? `${runtimeService.name}-data`, mountPath: volume.target })));
}

function runtimePorts(runtime: Readonly<Record<string, unknown>> | null): readonly RuntimePortDto[] {
  const fromContainerPorts = (assignedPorts: unknown): readonly RuntimePortDto[] => {
    if (!Array.isArray(assignedPorts)) return [];
    return assignedPorts.flatMap((entry) => {
      const record = objectValue(entry);
      if (!record) return [];
      const hostPort = numberValue(record['hostPort']);
      const rawContainerPort = record['containerPort'];
      const portText = typeof rawContainerPort === 'string' ? rawContainerPort : `${rawContainerPort ?? ''}`;
      const internalPort = numberValue(portText.split('/')[0]);
      if (hostPort === undefined || internalPort === undefined) return [];
      return [{ hostPort, internalPort, protocol: portText.includes('/') ? portText.split('/')[1] ?? 'tcp' : 'tcp' }];
    });
  };
  const containers = runtime?.['containers'];
  if (Array.isArray(containers)) return containers.flatMap((container) => fromContainerPorts(objectValue(container)?.['assignedPorts']));
  return fromContainerPorts(runtime?.['assignedPorts']);
}

function runtimeNetworks(runtime: Readonly<Record<string, unknown>> | null): readonly { readonly name: string }[] {
  const ids = runtime?.['networkIds'];
  if (Array.isArray(ids)) return ids.map((value, index) => ({ name: stringValue(value, `network-${index + 1}`) }));
  const id = runtime?.['networkId'];
  return typeof id === 'string' && id ? [{ name: id }] : [];
}

function runtimeErrors(runtime: Readonly<Record<string, unknown>> | null): readonly RuntimeErrorDto[] {
  if (!runtime) return [];
  const state = stringValue(runtime['state'], '');
  const lastError = stringValue(runtime['lastError'], '');
  const exitCode = numberValue(runtime['exitCode']);
  if (!state && !lastError && exitCode === undefined) return [];
  return [{ state: state || 'unknown', ...(exitCode !== undefined ? { exitCode } : {}), lastError: lastError || 'No runtime error message available.' }];
}
