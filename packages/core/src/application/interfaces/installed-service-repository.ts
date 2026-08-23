import type { ServiceDefinition } from '../../domain/catalog/service-definition.js';
import type { Environment } from '../../domain/projects/project.js';
import type { InstalledService, InstalledServiceStatus } from '../../domain/services/installed-service.js';

export interface InstallationPlan {
  readonly serviceDefinition: ServiceDefinition;
  readonly environment: Environment;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly publicEndpoints?: readonly RuntimePublicEndpoint[];
}

export interface RuntimePublicEndpoint {
  readonly name: string;
  readonly service: string;
  readonly port: number;
  readonly host: string;
  readonly url: string;
  readonly protocol: 'http' | 'https';
}

export interface RuntimeResult {
  readonly status: InstalledServiceStatus;
  readonly runtime?: Readonly<Record<string, unknown>> | null;
  readonly message?: string;
}

export interface RuntimeHealth {
  readonly status: 'healthy' | 'unhealthy' | 'unknown';
  readonly message?: string;
}

export interface RuntimeProvider {
  install(plan: InstallationPlan): Promise<RuntimeResult>;
  uninstall(service: InstalledService): Promise<RuntimeResult>;
  start(service: InstalledService): Promise<RuntimeResult>;
  stop(service: InstalledService): Promise<RuntimeResult>;
  restart(service: InstalledService): Promise<RuntimeResult>;
  health(service: InstalledService): Promise<RuntimeHealth>;
  refresh?(service: InstalledService): Promise<RuntimeResult>;
  updatePublicEndpoints?(service: InstalledService, publicEndpoints: readonly RuntimePublicEndpoint[]): Promise<RuntimeResult>;
  getLogs?(service: InstalledService): Promise<string>;
}

export interface InstalledServiceRepository {
  create(input: Omit<InstalledService, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstalledService>;
  findById(id: string): Promise<InstalledService | null>;
  listAll(): Promise<readonly InstalledService[]>;
  listByEnvironmentId(environmentId: string): Promise<readonly InstalledService[]>;
  findByEnvironmentIdAndName(environmentId: string, name: string): Promise<InstalledService | null>;
  updateStatus(id: string, status: InstalledServiceStatus, runtime?: Readonly<Record<string, unknown>> | null): Promise<InstalledService | null>;
  updateConfiguration(id: string, configuration: Readonly<Record<string, unknown>>, status: InstalledServiceStatus, runtime?: Readonly<Record<string, unknown>> | null): Promise<InstalledService | null>;
  delete(id: string): Promise<boolean>;
}
