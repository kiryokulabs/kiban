import type { InstalledServiceDto, AccessPointDto } from './service.dto';

export interface ServiceLocationDto {
  readonly project: { readonly id: string; readonly name: string };
  readonly environment: { readonly id: string; readonly name: string; readonly type: string };
}

export interface ServiceOverviewDto {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: string;
  readonly status: string;
  readonly health: string;
  readonly installedVersion: string;
  readonly runtime: string;
  readonly installedAt: string;
}

export interface ServiceConfigurationDto {
  readonly schema: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface RuntimeContainerDto {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly health: string;
  readonly image: string;
  readonly restartCount: number;
}

export interface RuntimeVolumeDto {
  readonly name: string;
  readonly mountPath: string;
  readonly size?: string;
}

export interface RuntimePortDto {
  readonly hostPort: number;
  readonly internalPort: number;
  readonly protocol: string;
}

export interface RuntimeNetworkDto { readonly name: string; }

export interface ServiceNetworkingDto {
  readonly assignedPorts: readonly RuntimePortDto[];
  readonly networks: readonly RuntimeNetworkDto[];
}

export interface RuntimeErrorDto {
  readonly state: string;
  readonly exitCode?: number;
  readonly lastError: string;
}

export interface ServiceLogsSectionDto {
  readonly value: string;
  readonly containers: readonly string[];
}

export interface InstalledServiceDetailsDto {
  readonly installedService: InstalledServiceDto;
  readonly location: ServiceLocationDto;
  readonly overview: ServiceOverviewDto;
  readonly accessPoints: readonly AccessPointDto[];
  readonly configuration: ServiceConfigurationDto;
  readonly containers: readonly RuntimeContainerDto[];
  readonly volumes: readonly RuntimeVolumeDto[];
  readonly networking: ServiceNetworkingDto;
  readonly errors: readonly RuntimeErrorDto[];
  readonly logs: ServiceLogsSectionDto;
}
