import type { CatalogItem } from '../../domain/catalog/catalog-item.js';
import type { Environment } from '../../domain/projects/project.js';
import type { InstalledService, InstalledServiceStatus } from '../../domain/services/installed-service.js';

export interface InstallationPlan {
  readonly serviceDefinition: CatalogItem;
  readonly environment: Environment;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly volumes: readonly unknown[];
  readonly networks: readonly unknown[];
  readonly ports: readonly unknown[];
}

export interface RuntimeResult { readonly status: InstalledServiceStatus; readonly message?: string; }
export interface RuntimeHealth { readonly status: 'healthy' | 'unhealthy' | 'unknown'; readonly message?: string; }

export interface RuntimeProvider {
  install(plan: InstallationPlan): Promise<RuntimeResult>;
  uninstall(service: InstalledService): Promise<RuntimeResult>;
  start(service: InstalledService): Promise<RuntimeResult>;
  stop(service: InstalledService): Promise<RuntimeResult>;
  restart(service: InstalledService): Promise<RuntimeResult>;
  health(service: InstalledService): Promise<RuntimeHealth>;
}

export interface InstalledServiceRepository {
  create(input: Omit<InstalledService, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstalledService>;
  findById(id: string): Promise<InstalledService | null>;
  listByEnvironmentId(environmentId: string): Promise<readonly InstalledService[]>;
  findByEnvironmentIdAndName(environmentId: string, name: string): Promise<InstalledService | null>;
  updateStatus(id: string, status: InstalledServiceStatus): Promise<InstalledService | null>;
  delete(id: string): Promise<boolean>;
}
