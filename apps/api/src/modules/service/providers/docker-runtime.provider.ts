import type { InstallationPlan, InstalledService, RuntimeHealth, RuntimeProvider, RuntimeResult } from '@kiban/core';
import { request as httpRequest } from 'node:http';
import { connect } from 'node:net';

interface DockerVersion { readonly Version?: string; readonly ApiVersion?: string; readonly MinAPIVersion?: string; }
interface DockerPortBinding { readonly HostIp?: string; readonly HostPort?: string; }
interface DockerCreateResponse { readonly Id: string; }
interface DockerInspectState { readonly Running?: boolean; readonly Status?: string; readonly Health?: { readonly Status?: string }; }
interface DockerInspectNetworkSettings { readonly Ports?: Readonly<Record<string, readonly DockerPortBinding[] | null>>; }
interface DockerInspectResponse extends Readonly<Record<string, unknown>> { readonly Id?: string; readonly Created?: string; readonly State?: DockerInspectState; readonly NetworkSettings?: DockerInspectNetworkSettings; }

export interface DockerRuntimeDiagnostics {
  readonly dockerInstalled: boolean;
  readonly dockerRunning: boolean;
  readonly dockerVersion: string | null;
  readonly engineVersion: string | null;
  readonly socketReachable: boolean;
  readonly compatibleApiVersion: boolean;
  readonly availableRuntimes: readonly string[];
}

export interface DockerEngineClient {
  ping(): Promise<boolean>;
  version(): Promise<DockerVersion>;
  inspectImage(image: string): Promise<boolean>;
  pullImage(image: string, tag: string): Promise<void>;
  ensureNetwork(name: string): Promise<string>;
  ensureVolume(name: string): Promise<string>;
  createContainer(name: string, payload: Readonly<Record<string, unknown>>): Promise<string>;
  startContainer(id: string): Promise<void>;
  inspectContainer(id: string): Promise<Readonly<Record<string, unknown>>>;
  stopContainer(id: string): Promise<void>;
  restartContainer(id: string): Promise<void>;
  removeContainer(id: string): Promise<void>;
  logs(id: string): Promise<string>;
}

class DockerHttpEngineClient implements DockerEngineClient {
  public constructor(private readonly socketPath = process.env['DOCKER_SOCKET_PATH'] ?? '/var/run/docker.sock') {}

  public async ping(): Promise<boolean> {
    try { return (await this.raw('GET', '/_ping')).trim() === 'OK'; } catch { return false; }
  }

  public version(): Promise<DockerVersion> { return this.json<DockerVersion>('GET', '/version'); }
  public async inspectImage(image: string): Promise<boolean> { try { await this.json('GET', `/images/${encodeURIComponent(image)}/json`); return true; } catch { return false; } }
  public async pullImage(image: string, tag: string): Promise<void> { await this.raw('POST', `/images/create?fromImage=${encodeURIComponent(image)}&tag=${encodeURIComponent(tag)}`); }
  public async ensureNetwork(name: string): Promise<string> { try { const existing = await this.json<{ readonly Id: string }>('GET', `/networks/${encodeURIComponent(name)}`); return existing.Id; } catch { try { const created = await this.json<{ readonly Id: string }>('POST', '/networks/create', { Name: name, CheckDuplicate: true }); return created.Id; } catch (error: unknown) { if (error instanceof Error && error.message.includes('already exists')) { const existing = await this.json<{ readonly Id: string }>('GET', `/networks/${encodeURIComponent(name)}`); return existing.Id; } throw error; } } }
  public async ensureVolume(name: string): Promise<string> { try { const existing = await this.json<{ readonly Name: string }>('GET', `/volumes/${encodeURIComponent(name)}`); return existing.Name; } catch { try { const created = await this.json<{ readonly Name: string }>('POST', '/volumes/create', { Name: name }); return created.Name; } catch (error: unknown) { if (error instanceof Error && error.message.includes('already exists')) { const existing = await this.json<{ readonly Name: string }>('GET', `/volumes/${encodeURIComponent(name)}`); return existing.Name; } throw error; } } }
  public async createContainer(name: string, payload: Readonly<Record<string, unknown>>): Promise<string> { const created = await this.json<DockerCreateResponse>('POST', `/containers/create?name=${encodeURIComponent(name)}`, payload); return created.Id; }
  public async startContainer(id: string): Promise<void> { await this.raw('POST', `/containers/${encodeURIComponent(id)}/start`); }
  public inspectContainer(id: string): Promise<Readonly<Record<string, unknown>>> { return this.json('GET', `/containers/${encodeURIComponent(id)}/json`); }
  public async stopContainer(id: string): Promise<void> { await this.raw('POST', `/containers/${encodeURIComponent(id)}/stop`); }
  public async restartContainer(id: string): Promise<void> { await this.raw('POST', `/containers/${encodeURIComponent(id)}/restart`); }
  public async removeContainer(id: string): Promise<void> { await this.raw('DELETE', `/containers/${encodeURIComponent(id)}?force=true`); }
  public logs(id: string): Promise<string> { return this.raw('GET', `/containers/${encodeURIComponent(id)}/logs?stdout=true&stderr=true&tail=200`); }

  private async json<T>(method: string, path: string, body?: unknown): Promise<T> { const output = await this.raw(method, path, body); return output ? JSON.parse(output) as T : {} as T; }

  private raw(method: string, path: string, body?: unknown): Promise<string> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = httpRequest({ socketPath: this.socketPath, method, path, headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : undefined }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const output = Buffer.concat(chunks).toString('utf8');
          const ok = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300;
          ok ? resolve(output) : reject(new Error(output || `Docker Engine API error ${res.statusCode ?? 'unknown'}`));
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}

/** Docker RuntimeProvider implemented against the Docker Engine API. */
export class DockerRuntimeProvider implements RuntimeProvider {
  private constructor(private readonly client: DockerEngineClient) {}

  /** Creates the production Docker runtime provider. */
  public static create(): DockerRuntimeProvider { return new DockerRuntimeProvider(new DockerHttpEngineClient()); }

  /** Creates a Docker runtime provider with a test client. */
  public static withClient(client: DockerEngineClient): DockerRuntimeProvider { return new DockerRuntimeProvider(client); }

  /** Returns Docker runtime diagnostics for API/UI startup checks. */
  public async diagnostics(): Promise<DockerRuntimeDiagnostics> {
    const dockerRunning = await this.client.ping();
    let version: DockerVersion = {};
    if (dockerRunning) version = await this.client.version();
    return { dockerInstalled: dockerRunning, dockerRunning, dockerVersion: version.Version ?? null, engineVersion: version.ApiVersion ?? null, socketReachable: dockerRunning, compatibleApiVersion: this.isCompatible(version), availableRuntimes: dockerRunning ? ['docker'] : [] };
  }

  /** Installs a service by creating Docker resources from the generic installation plan. */
  public async install(plan: InstallationPlan): Promise<RuntimeResult> {
    if (!(await this.client.ping())) throw new Error('Docker runtime is not available.');
    const image = this.imageName(plan);
    const tag = this.imageTag(plan);
    const fullImage = `${image}:${tag}`;
    if (!(await this.client.inspectImage(fullImage))) await this.client.pullImage(image, tag);
    const networkName = this.networkName(plan);
    const networkId = await this.client.ensureNetwork(networkName);
    const volumeIds = [];
    for (const volume of this.volumeDefinitions(plan)) volumeIds.push(await this.client.ensureVolume(volume.name));
    const containerId = await this.client.createContainer(this.containerName(plan), this.containerPayload(plan, fullImage, networkName));
    await this.client.startContainer(containerId);
    const inspect = await this.client.inspectContainer(containerId) as DockerInspectResponse;
    const health = this.healthFromInspect(inspect);
    return { status: health === 'healthy' ? 'running' : 'failed', runtime: { provider: 'docker', containerId, networkIds: [networkId], volumeIds, image, imageTag: tag, assignedPorts: this.assignedPorts(inspect), health, status: this.containerStatus(inspect), createdAt: inspect.Created ?? new Date().toISOString() } };
  }

  /** Removes the Docker container for an installed service. */
  public async uninstall(service: InstalledService): Promise<RuntimeResult> { const id = this.containerId(service) ?? this.fallbackContainerName(service); await this.client.removeContainer(id); return { status: 'removing', runtime: service.runtime }; }
  /** Starts the Docker container for an installed service. */
  public async start(service: InstalledService): Promise<RuntimeResult> { const id = this.requireContainerId(service); await this.client.startContainer(id); const inspect = await this.client.inspectContainer(id) as DockerInspectResponse; return { status: this.healthFromInspect(inspect) === 'healthy' ? 'running' : 'failed', runtime: { ...service.runtime, health: this.healthFromInspect(inspect), status: this.containerStatus(inspect), assignedPorts: this.assignedPorts(inspect) } }; }
  /** Stops the Docker container for an installed service. */
  public async stop(service: InstalledService): Promise<RuntimeResult> { await this.client.stopContainer(this.requireContainerId(service)); return { status: 'stopped', runtime: { ...service.runtime, status: 'stopped' } }; }
  /** Restarts the Docker container for an installed service. */
  public async restart(service: InstalledService): Promise<RuntimeResult> { const id = this.requireContainerId(service); await this.client.restartContainer(id); const inspect = await this.client.inspectContainer(id) as DockerInspectResponse; return { status: this.healthFromInspect(inspect) === 'healthy' ? 'running' : 'failed', runtime: { ...service.runtime, health: this.healthFromInspect(inspect), status: this.containerStatus(inspect), assignedPorts: this.assignedPorts(inspect) } }; }
  /** Reads Docker health for an installed service. */
  public async health(service: InstalledService): Promise<RuntimeHealth> { const inspect = await this.client.inspectContainer(this.requireContainerId(service)) as DockerInspectResponse; return { status: this.healthFromInspect(inspect) }; }
  /** Fetches recent Docker logs for an installed service. */
  public getLogs(service: InstalledService): Promise<string> { return this.client.logs(this.requireContainerId(service)); }

  private imageName(plan: InstallationPlan): string { return plan.serviceDefinition.metadata.docker?.image ?? plan.serviceDefinition.id; }
  private imageTag(plan: InstallationPlan): string { return plan.serviceDefinition.metadata.docker?.tag ?? 'latest'; }
  private networkName(plan: InstallationPlan): string { return `kiban-${plan.environment.projectId}-${plan.environment.id}`; }
  private containerName(plan: InstallationPlan): string { return `kiban-${plan.environment.id}-${plan.serviceDefinition.id}`.replace(/[^a-zA-Z0-9_.-]/g, '-'); }
  private volumeDefinitions(plan: InstallationPlan): readonly { readonly name: string; readonly mountPath: string }[] { return (plan.serviceDefinition.metadata.volumes ?? []).map((volume) => ({ name: `kiban-${plan.environment.id}-${plan.serviceDefinition.id}-${volume.name}`, mountPath: volume.mountPath })); }
  private containerPayload(plan: InstallationPlan, image: string, networkName: string): Readonly<Record<string, unknown>> { const ports = plan.serviceDefinition.metadata.ports ?? []; const exposedPorts = Object.fromEntries(ports.map((port) => [`${port.port}/${port.protocol}`, {}])); const portBindings = Object.fromEntries(ports.map((port) => [`${port.port}/${port.protocol}`, [{ HostIp: '0.0.0.0', HostPort: '' }]])); return { Image: image, Env: Object.entries(plan.variables).map(([key, value]) => `${key}=${String(value)}`), ExposedPorts: exposedPorts, HostConfig: { RestartPolicy: { Name: 'unless-stopped' }, PortBindings: portBindings, Mounts: this.volumeDefinitions(plan).map((volume) => ({ Type: 'volume', Source: volume.name, Target: volume.mountPath })) }, NetworkingConfig: { EndpointsConfig: { [networkName]: {} } } }; }
  private assignedPorts(inspect: DockerInspectResponse): readonly Record<string, string | number>[] { const ports = inspect.NetworkSettings?.Ports ?? {}; return Object.entries(ports).flatMap(([containerPort, bindings]) => (bindings ?? []).map((binding) => ({ containerPort, hostIp: binding.HostIp ?? '0.0.0.0', hostPort: binding.HostPort ?? '' }))); }
  private healthFromInspect(inspect: DockerInspectResponse): 'healthy' | 'unhealthy' | 'unknown' { if (inspect.State?.Health?.Status === 'healthy') return 'healthy'; if (inspect.State?.Health?.Status === 'unhealthy') return 'unhealthy'; return inspect.State?.Running ? 'healthy' : 'unhealthy'; }
  private containerStatus(inspect: DockerInspectResponse): string { return inspect.State?.Status ?? (inspect.State?.Running ? 'running' : 'unknown'); }
  private isCompatible(version: DockerVersion): boolean { return Boolean(version.ApiVersion); }
  private containerId(service: InstalledService): string | null { const value = service.runtime?.['containerId']; return typeof value === 'string' ? value : null; }
  private fallbackContainerName(service: InstalledService): string { return `kiban-${service.environmentId}-${service.serviceId}`.replace(/[^a-zA-Z0-9_.-]/g, '-'); }
  private requireContainerId(service: InstalledService): string { const id = this.containerId(service); if (!id) throw new Error('Installed service does not have Docker runtime metadata.'); return id; }
}

export const createTcpProbe = (host: string, port: number, timeoutMs = 1000): Promise<boolean> => new Promise((resolve) => {
  const socket = connect({ host, port, timeout: timeoutMs }, () => { socket.destroy(); resolve(true); });
  socket.on('timeout', () => { socket.destroy(); resolve(false); });
  socket.on('error', () => resolve(false));
});
