export type InstalledServiceStatus = 'pending' | 'installing' | 'running' | 'stopped' | 'failed' | 'removing';

export interface AccessPoint {
  readonly name: string;
  readonly kind: string;
  readonly port: number;
  readonly hostPort?: number | undefined;
  readonly host: string;
  readonly url?: string | undefined;
  readonly username?: string | undefined;
  readonly password?: string | undefined;
  readonly database?: string | undefined;
  readonly connectionString?: string | undefined;
}

export interface InstalledService {
  readonly id: string;
  readonly environmentId: string;
  readonly serviceId: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly icon?: string | undefined;
  readonly status: InstalledServiceStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly runtime: Readonly<Record<string, unknown>> | null;
  readonly accessPoints?: readonly AccessPoint[];
  readonly url?: string | undefined;
  readonly location?: ServiceLocation;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface InstallServiceRequest { readonly serviceId: string; readonly configuration: Readonly<Record<string, unknown>>; }

export interface ServiceLocation {
  readonly project: { readonly id: string; readonly name: string };
  readonly environment: { readonly id: string; readonly name: string; readonly type: string };
}

export interface ServiceOverview {
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

export interface ServiceHealthDetails {
  readonly status: string;
  readonly source: string;
  readonly checkedAt: string;
  readonly message: string;
}

export interface ServiceActivityItem { readonly label: string; readonly value: string; }

export interface ServiceConfiguration {
  readonly schema: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface RuntimeContainer { readonly id: string; readonly name: string; readonly status: string; readonly health: string; readonly image: string; readonly restartCount: number; }
export interface RuntimeVolume { readonly name: string; readonly mountPath: string; readonly size?: string; }
export interface RuntimePort { readonly hostPort: number; readonly internalPort: number; readonly protocol: string; }
export interface RuntimeNetwork { readonly name: string; }
export interface ServiceNetworking { readonly assignedPorts: readonly RuntimePort[]; readonly networks: readonly RuntimeNetwork[]; }
export interface RuntimeError { readonly state: string; readonly exitCode?: number; readonly lastError: string; }
export interface ServiceLogsSection { readonly value: string; readonly containers: readonly string[]; }

export interface InstalledServiceDetails {
  readonly installedService: InstalledService;
  readonly location: ServiceLocation;
  readonly overview: ServiceOverview;
  readonly healthDetails: ServiceHealthDetails;
  readonly activity: readonly ServiceActivityItem[];
  readonly accessPoints: readonly AccessPoint[];
  readonly configuration: ServiceConfiguration;
  readonly containers: readonly RuntimeContainer[];
  readonly volumes: readonly RuntimeVolume[];
  readonly networking: ServiceNetworking;
  readonly errors: readonly RuntimeError[];
  readonly logs: ServiceLogsSection;
}
