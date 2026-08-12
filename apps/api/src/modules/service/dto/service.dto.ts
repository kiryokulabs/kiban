import type { InstalledServiceStatus } from '@kiban/core';

export interface InstallServiceDto {
  readonly serviceId: string;
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface AccessPointDto {
  readonly name: string;
  readonly kind: string;
  readonly port: number;
  readonly hostPort?: number;
  readonly host: string;
  readonly url?: string;
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
  readonly connectionString?: string;
}

export interface InstalledServiceLocationDto {
  readonly project: { readonly id: string; readonly name: string };
  readonly environment: { readonly id: string; readonly name: string; readonly type: string };
}

export interface InstalledServiceDto {
  readonly id: string;
  readonly environmentId: string;
  readonly serviceId: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly status: InstalledServiceStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly runtime: Readonly<Record<string, unknown>> | null;
  readonly accessPoints?: readonly AccessPointDto[];
  readonly url?: string;
  readonly location?: InstalledServiceLocationDto;
  readonly createdAt: string;
  readonly updatedAt: string;
}
