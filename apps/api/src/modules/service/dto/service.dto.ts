import type { InstalledServiceStatus } from '@kiban/core';

export interface InstallServiceDto { readonly serviceId: string; readonly configuration: Readonly<Record<string, unknown>>; }
export interface InstalledServiceDto {
  readonly id: string;
  readonly environmentId: string;
  readonly serviceId: string;
  readonly name: string;
  readonly status: InstalledServiceStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
