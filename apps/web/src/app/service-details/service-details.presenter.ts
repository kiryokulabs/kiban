import type { InstalledService, AccessPoint, InstalledServiceDetails, RuntimeContainer, RuntimeVolume, RuntimeNetwork, RuntimeError } from '../installed-services/installed-services.models';


export interface SchemaField {
  readonly key: string;
  readonly label: string;
  readonly type: string;
  readonly required: boolean;
  readonly secret: boolean;
}

export interface CopyField { readonly label: string; readonly value: string; readonly secret: boolean; }

export interface TerminalCommand { readonly containerName: string; readonly command: string; }

/**
 * Presenter for service details logic.
 * Pure functions that transform access point data for display.
 */
export class ServiceDetailsPresenter {
  /**
   * Returns access points from the service, or falls back to legacy
   * runtime-based access URLs for backward compatibility.
   */
  public accessPointsFor(service: InstalledService): readonly AccessPoint[] | undefined {
    if (service.accessPoints && service.accessPoints.length > 0) {
      return service.accessPoints;
    }
    // Legacy fallback: generate web access points from runtime assignedPorts
    const urls = this.legacyUrls(service);
    if (urls.length > 0) return urls;
    return undefined;
  }

  /** Returns true if any access point is a web kind (has a browser-accessible URL). */
  public hasWebAccess(accessPoints: readonly AccessPoint[] | undefined): boolean {
    return accessPoints?.some((ap) => ap.kind === 'web') ?? false;
  }

  /** Returns true if any access point is a non-web kind (database, cache, queue, etc.). */
  public hasDatabaseAccess(accessPoints: readonly AccessPoint[] | undefined): boolean {
    return accessPoints?.some((ap) => ap.kind !== 'web') ?? false;
  }

  /** Returns true if service has any access points at all. */
  public hasAccessPoints(service: InstalledService): boolean {
    const aps = this.accessPointsFor(service);
    return aps !== undefined && aps.length > 0;
  }

  /** Returns Open URLs for web-kind access points. */
  public webUrls(accessPoints: readonly AccessPoint[] | undefined): readonly string[] {
    if (!accessPoints) return [];
    return accessPoints
      .filter((ap) => ap.kind === 'web' && (ap.url || ap.hostPort))
      .map((ap) => ap.url ?? `http://${ap.host}:${ap.hostPort}`);
  }

  /** Returns only non-web access points (database, cache, queue, etc.). */
  public databaseAccessPoints(accessPoints: readonly AccessPoint[] | undefined): readonly AccessPoint[] {
    if (!accessPoints) return [];
    return accessPoints.filter((ap) => ap.kind !== 'web');
  }

  /** Returns the network address for an access point (host:port). */
  public networkAccessPoint(ap: AccessPoint): string {
    return `${ap.host}:${ap.hostPort ?? ap.port}`;
  }

  /** Returns the display label for the runtime provider. */
  public serviceLabel(runtime: Readonly<Record<string, unknown>> | null): string {
    const provider = runtime?.['provider'];
    return typeof provider === 'string' && provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Unknown';
  }

  /** Obfuscates the password in a connection string for display. */
  public obfuscatedConnectionString(ap: AccessPoint): string {
    if (!ap.password || !ap.connectionString) return ap.connectionString ?? '';
    const password = ap.password;
    return ap.connectionString.replace(password, '••••••••');
  }




  /** Returns a compact human-readable project/environment location label. */
  public locationLabel(details: InstalledServiceDetails): string {
    return `${details.location.project.name} / ${details.location.environment.name}`;
  }

  /** Returns dynamic form fields derived exclusively from schema.json. */
  public schemaFields(details: InstalledServiceDetails): readonly SchemaField[] {
    const properties = details.configuration.schema['properties'];
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
    const requiredSource = details.configuration.schema['required'];
    const required = new Set(Array.isArray(requiredSource) ? requiredSource.filter((item): item is string => typeof item === 'string') : []);
    return Object.entries(properties as Readonly<Record<string, unknown>>).map(([key, raw]) => {
      const property = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Readonly<Record<string, unknown>> : {};
      const title = property['title'];
      const type = property['type'];
      const lowerKey = key.toLowerCase();
      return {
        key,
        label: typeof title === 'string' && title ? title : key,
        type: typeof type === 'string' && type ? type : 'string',
        required: required.has(key),
        secret: lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')
      };
    });
  }

  /** Masks a secret until the user explicitly asks to reveal it. */
  public displaySecret(value: string, visible: boolean): string { return visible ? value : '••••••••'; }

  /** Returns copyable fields for an access point. */
  public copyFieldsFor(ap: AccessPoint): readonly CopyField[] {
    const result: CopyField[] = [
      { label: 'Host', value: ap.host, secret: false },
      { label: 'Port', value: `${ap.hostPort ?? ap.port}`, secret: false }
    ];
    if (ap.username) result.push({ label: 'Username', value: ap.username, secret: false });
    if (ap.password) result.push({ label: 'Password', value: ap.password, secret: true });
    if (ap.database) result.push({ label: 'Database', value: ap.database, secret: false });
    if (ap.connectionString) result.push({ label: 'Connection String', value: ap.connectionString, secret: Boolean(ap.password) });
    return result;
  }

  /** Returns runtime containers from the backend DTO. */
  public containers(details: InstalledServiceDetails): readonly RuntimeContainer[] { return details.containers; }
  /** Returns persistent volumes from the backend DTO. */
  public volumes(details: InstalledServiceDetails): readonly RuntimeVolume[] { return details.volumes; }
  /** Returns service networks from the backend DTO. */
  public networks(details: InstalledServiceDetails): readonly RuntimeNetwork[] { return details.networking.networks; }
  /** Returns runtime errors from the backend DTO. */
  public errors(details: InstalledServiceDetails): readonly RuntimeError[] { return details.errors; }
  /** Returns current log text from the backend DTO. */
  public logs(details: InstalledServiceDetails): string { return details.logs.value; }

  /** Returns copyable local terminal commands for each runtime container. */
  public terminalCommands(details: InstalledServiceDetails): readonly TerminalCommand[] {
    return details.containers.map((container) => ({
      containerName: container.name,
      command: `docker exec -it ${this.shellQuote(container.name)} sh`
    }));
  }

  /** Generates legacy web access points from runtime assignedPorts. */
  private legacyUrls(service: InstalledService): readonly AccessPoint[] {
    const assignedPorts = service.runtime?.['assignedPorts'];
    if (!Array.isArray(assignedPorts)) return [];
    const result: AccessPoint[] = [];
    for (const entry of assignedPorts) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const ap = entry as Readonly<Record<string, unknown>>;
      const hostPort = ap['hostPort'];
      const containerPort = ap['containerPort'];
      if (typeof hostPort === 'string' && hostPort) {
        result.push({
          name: 'Web UI',
          kind: 'web',
          port: typeof containerPort === 'number' ? containerPort : 80,
          hostPort: Number(hostPort),
          host: 'localhost'
        });
      }
    }
    return result;
  }

  private shellQuote(value: string): string {
    return /^[A-Za-z0-9_.-]+$/.test(value) ? value : `'${value.replace(/'/g, `'"'"'`)}'`;
  }
}
