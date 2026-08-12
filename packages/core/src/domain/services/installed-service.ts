export type InstalledServiceStatus = 'pending' | 'installing' | 'running' | 'stopped' | 'failed' | 'removing';

export interface InstalledService {
  readonly id: string;
  readonly environmentId: string;
  readonly serviceId: string;
  readonly name: string;
  readonly status: InstalledServiceStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly runtime: Readonly<Record<string, unknown>> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InstallServiceInput {
  readonly serviceId: string;
  readonly configuration: Readonly<Record<string, unknown>>;
}
