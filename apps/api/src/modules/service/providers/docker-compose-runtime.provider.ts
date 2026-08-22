import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { Logger } from '@nestjs/common';
import { parse, stringify } from 'yaml';
import type { InstallationPlan, InstalledService, RuntimeHealth, RuntimeProvider, RuntimePublicEndpoint, RuntimeResult } from '@kiban/core';
import type { RuntimeStatusDto } from '../dto/runtime.dto';

export interface ComposeCommandRunner {
  run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }>;
}

export interface HostPortAllocator {
  reserve(preferredPort: number, reservedPorts: ReadonlySet<number>): Promise<number>;
}

export interface WebHealthChecker {
  isReachable(url: string): Promise<boolean>;
}

export interface KibanPlatformLogs { readonly available: boolean; readonly logs: string; readonly message: string | null; }

export interface TraefikRouter {
  readonly name: string;
  readonly rule: string;
  readonly entrypoint: string;
  readonly service: string;
  readonly port: string;
  readonly container: string;
}

export interface TraefikInfo {
  readonly status: 'running' | 'stopped' | 'not-installed';
  readonly version: string | null;
  readonly ports: readonly { readonly published: number; readonly target: number }[];
  readonly entrypoints: readonly { readonly name: string; readonly address: string }[];
  readonly dockerNetwork: string | null;
  readonly dashboard: boolean;
  readonly routers: readonly TraefikRouter[];
}

class SpawnComposeCommandRunner implements ComposeCommandRunner {
  public run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: options.cwd, shell: false });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(stderr || `${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
      });
    });
  }
}

class NodeHostPortAllocator implements HostPortAllocator {
  public async reserve(preferredPort: number, reservedPorts: ReadonlySet<number>): Promise<number> {
    for (let candidate = preferredPort; candidate <= 65535; candidate += 1) {
      if (reservedPorts.has(candidate)) continue;
      if (await this.canListen(candidate)) return candidate;
    }
    throw new Error(`No available host port found starting at ${preferredPort}.`);
  }

  private canListen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '0.0.0.0');
    });
  }
}

class NodeWebHealthChecker implements WebHealthChecker {
  public isReachable(url: string): Promise<boolean> {
    return new Promise((resolveHealth) => {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const request = client.get(parsed, (response) => {
        response.resume();
        const status = response.statusCode ?? 0;
        resolveHealth((status >= 200 && status < 400) || status === 401 || status === 403);
      });
      request.setTimeout(3000, () => {
        request.destroy();
        resolveHealth(false);
      });
      request.on('error', () => resolveHealth(false));
    });
  }
}

interface ComposeContainerInfo {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly health: string;
  readonly image: string;
  readonly restartCount: number;
  readonly assignedPorts: readonly Record<string, string | number>[];
}

const COMPOSE_FALLBACK_PATTERN = /^\$\{([^:}]+):-(.*)\}$/;
const COMPOSE_HOST_PORT_PATTERN = /\$\{([A-Z0-9_]+):-(\d+)\}\s*:\s*\d+/g;
const DOCKER_PORT_COLLISION_PATTERN = /Bind for [^:]+:(\d+) failed: port is already allocated/i;
const DOCKER_NETWORK_EXISTS_PATTERN = /already exists/i;
const SHARED_REVERSE_PROXY_NETWORK = 'kiban';
const TRAEFIK_PROJECT_NAME = 'kiban-traefik';

const sanitize = (value: string): string => value.replace(/[^a-zA-Z0-9_.-]/g, '-');
const traefikName = (value: string): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'service';
};

const resolveComposeFallback = (value: unknown): { readonly value: string; readonly variableName?: string } => {
  const text = String(value);
  const match = COMPOSE_FALLBACK_PATTERN.exec(text);
  if (!match) return { value: text };
  const variableName = match[1];
  const fallback = match[2] ?? '';
  return variableName ? { value: fallback, variableName } : { value: fallback };
};

/** RuntimeProvider implementation backed by Docker Compose CLI. */
export class DockerComposeRuntimeProvider implements RuntimeProvider {
  private readonly logger = new Logger(DockerComposeRuntimeProvider.name);
  private reverseProxyReady = false;

  private constructor(
    private readonly runner: ComposeCommandRunner,
    private readonly runtimeRoot: string,
    private readonly portAllocator: HostPortAllocator,
    private readonly webHealthChecker: WebHealthChecker
  ) {}

  /** Creates the production Docker Compose runtime provider. */
  public static create(): DockerComposeRuntimeProvider {
    return new DockerComposeRuntimeProvider(new SpawnComposeCommandRunner(), join(homedir(), '.kiban', 'runtime', 'services'), new NodeHostPortAllocator(), new NodeWebHealthChecker());
  }

  /** Creates a provider with a fake runner and runtime root for tests. */
  public static withRunner(runner: ComposeCommandRunner, runtimeRoot: string, portAllocator: HostPortAllocator = new NodeHostPortAllocator(), webHealthChecker: WebHealthChecker = new NodeWebHealthChecker()): DockerComposeRuntimeProvider {
    return new DockerComposeRuntimeProvider(runner, runtimeRoot, portAllocator, webHealthChecker);
  }

  /** Returns Docker Compose diagnostics for API/UI runtime status. */
  public async diagnostics(): Promise<RuntimeStatusDto> {
    try {
      await mkdir(this.runtimeRoot, { recursive: true });
      const result = await this.runner.run('docker', ['compose', 'version'], { cwd: this.runtimeRoot });
      await this.ensureReverseProxy();
      return { dockerInstalled: true, dockerRunning: true, dockerVersion: result.stdout.trim() || null, engineVersion: result.stdout.trim() || null, socketReachable: true, compatibleApiVersion: true, availableRuntimes: ['docker-compose'] };
    } catch {
      return { dockerInstalled: false, dockerRunning: false, dockerVersion: null, engineVersion: null, socketReachable: false, compatibleApiVersion: false, availableRuntimes: [] };
    }
  }

  /** Reads logs for the installed Kiban core runtime. */
  public async platformLogs(): Promise<KibanPlatformLogs> {
    const runtimeDir = join(resolve(this.runtimeRoot), '..', 'kiban');
    const composeFile = join(runtimeDir, 'compose.yaml');
    const envFile = join(runtimeDir, '.env');
    if (!(await this.fileExists(composeFile)) || !(await this.fileExists(envFile))) return { available: false, logs: '', message: 'Kiban core runtime logs are only available for Docker-installed Kiban.' };

    const result = await this.runner.run('docker', ['compose', '--env-file', envFile, '-f', composeFile, 'logs', '--tail=300', 'kiban-api', 'kiban-web'], { cwd: runtimeDir });
    return { available: true, logs: `${result.stdout}${result.stderr}`.trim(), message: null };
  }

  /** Applies or removes the instance domain routing on the Kiban core compose. */
  public async applyInstanceDomain(domain: string): Promise<boolean> {
    const runtimeDir = join(resolve(this.runtimeRoot), '..', 'kiban');
    const composeFile = join(runtimeDir, 'compose.yaml');
    const envFile = join(runtimeDir, '.env');
    if (!(await this.fileExists(composeFile)) || !(await this.fileExists(envFile))) return false;

    await this.ensureReverseProxy();

    const composeContent = await readFile(composeFile, 'utf8');
    const updated = this.withInstanceDomainRouting(composeContent, domain.trim());
    await writeFile(composeFile, updated, 'utf8');
    await this.runner.run('docker', ['compose', '--env-file', envFile, '-f', 'compose.yaml', 'up', '-d', '--force-recreate'], { cwd: runtimeDir });
    return true;
  }

  /** Returns information about the Kiban Traefik reverse proxy and its active routers. */
  public async getTraefikInfo(): Promise<TraefikInfo> {
    const traefikDir = join(resolve(this.runtimeRoot), '..', 'traefik');
    const composeFile = join(traefikDir, 'compose.yaml');
    if (!(await this.fileExists(composeFile))) {
      return { status: 'not-installed', version: null, ports: [], entrypoints: [], dockerNetwork: null, dashboard: false, routers: [] };
    }

    const composeContent = await readFile(composeFile, 'utf8');
    const config = this.parseTraefikCompose(composeContent);

    let status: 'running' | 'stopped' = 'stopped';
    try {
      const { stdout } = await this.runner.run('docker', ['compose', '--project-name', TRAEFIK_PROJECT_NAME, '-f', 'compose.yaml', 'ps', '-a', '--format', 'json'], { cwd: traefikDir });
      const containers = this.parsePs(stdout);
      status = containers.some((c) => c.status === 'running') ? 'running' : 'stopped';
    } catch {
      status = 'stopped';
    }

    const routers = await this.collectTraefikRouters(traefikDir);

    return { status, ...config, routers };
  }

  /** Attempts to prepare Kiban's shared reverse proxy during API startup. */
  public async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureReverseProxy();
    } catch (error) {
      this.logger.warn(`Kiban reverse proxy is not ready: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Installs a catalog service by writing its Compose workspace and running `docker compose up -d`. */
  public async install(plan: InstallationPlan): Promise<RuntimeResult> {
    const workspace = this.workspaceFor(plan.environment.id, plan.serviceDefinition.id);
    await mkdir(workspace, { recursive: true });
    const composeFile = join(workspace, 'compose.yaml');
    const envFile = join(workspace, '.env');
    const projectName = this.projectName(plan.environment.id, plan.serviceDefinition.id);
    const networkName = this.networkName(plan.environment.id);
    await this.ensureReverseProxy();
    let generatedComposeYaml = this.composeYamlForRuntime(plan.serviceDefinition.composeYaml, networkName, plan.publicEndpoints ?? []);
    generatedComposeYaml = await this.materializeGeneratedBindFiles(workspace, generatedComposeYaml);
    let variables = await this.variablesWithAvailableHostPorts(generatedComposeYaml, this.variablesWithPublicEndpoints(plan.variables, plan.publicEndpoints ?? [], plan.serviceDefinition.id));
    await this.ensureEnvironmentNetwork(workspace, networkName);
    await writeFile(composeFile, generatedComposeYaml, 'utf8');
    await writeFile(envFile, this.envFile(variables), 'utf8');
    variables = await this.composeUpWithPortCollisionRetry(workspace, projectName, generatedComposeYaml, variables, envFile);
    const containers = await this.ps(workspace, projectName);
    const health = await this.runtimeHealth(containers, plan.publicEndpoints ?? []);
    return { status: health.status === 'unhealthy' ? 'failed' : 'running', runtime: { provider: 'docker-compose', projectName, workingDirectory: workspace, composeFile, envFile, networkName, sharedNetworkName: SHARED_REVERSE_PROXY_NETWORK, publicEndpoints: plan.publicEndpoints ?? [], containers, health: health.status, healthSource: health.source, healthCheckedAt: health.checkedAt, healthMessage: health.message, status: 'running', createdAt: new Date().toISOString() } };
  }

  /** Removes the Compose project and persistent volumes for an installed service. */
  public async uninstall(service: InstalledService): Promise<RuntimeResult> {
    await this.composeFromService(service, ['down', '-v']);
    await this.removeWorkspace(service);
    return { status: 'removing', runtime: service.runtime };
  }

  /** Starts the Compose project. */
  public async start(service: InstalledService): Promise<RuntimeResult> {
    await this.composeFromService(service, ['start']);
    return { status: 'running', runtime: await this.refreshRuntime(service) };
  }

  /** Stops the Compose project. */
  public async stop(service: InstalledService): Promise<RuntimeResult> {
    await this.composeFromService(service, ['stop']);
    return { status: 'stopped', runtime: await this.refreshRuntime(service) };
  }

  /** Restarts the Compose project. */
  public async restart(service: InstalledService): Promise<RuntimeResult> {
    await this.composeFromService(service, ['restart']);
    return { status: 'running', runtime: await this.refreshRuntime(service) };
  }

  /** Reads health from Compose ps metadata. */
  public async health(service: InstalledService): Promise<RuntimeHealth> {
    const runtime = await this.refreshRuntime(service);
    const health = runtime['health'];
    return { status: health === 'healthy' ? 'healthy' : health === 'unhealthy' ? 'unhealthy' : 'unknown' };
  }

  /** Refreshes runtime metadata without changing service lifecycle state. */
  public async refresh(service: InstalledService): Promise<RuntimeResult> {
    const runtime = await this.refreshRuntime(service);
    const status = runtime['status'] === 'running' ? (runtime['health'] === 'unhealthy' ? 'failed' : 'running') : 'stopped';
    return { status, runtime };
  }

  /** Returns Docker Compose logs for the installed service. */
  public async getLogs(service: InstalledService): Promise<string> {
    const { stdout } = await this.composeFromService(service, ['logs', '--no-color']);
    return stdout;
  }

  private workspaceFor(environmentId: string, serviceId: string): string {
    return join(this.runtimeRoot, sanitize(`${environmentId}-${serviceId}`));
  }

  private projectName(environmentId: string, serviceId: string): string {
    return sanitize(`kiban-${environmentId}-${serviceId}`).toLowerCase();
  }

  private networkName(environmentId: string): string {
    return sanitize(`kiban-env-${environmentId}`).toLowerCase();
  }

  private async ensureEnvironmentNetwork(cwd: string, networkName: string): Promise<void> {
    await this.ensureNetwork(cwd, networkName);
  }

  private async ensureNetwork(cwd: string, networkName: string): Promise<void> {
    try {
      await this.runner.run('docker', ['network', 'inspect', networkName], { cwd });
    } catch {
      try {
        await this.runner.run('docker', ['network', 'create', networkName], { cwd });
      } catch (error) {
        if (!DOCKER_NETWORK_EXISTS_PATTERN.test(error instanceof Error ? error.message : String(error))) throw error;
      }
    }
  }

  private async ensureReverseProxy(): Promise<void> {
    if (this.reverseProxyReady) return;
    const workspace = join(resolve(this.runtimeRoot), '..', 'traefik');
    await mkdir(workspace, { recursive: true });
    await this.ensureNetwork(workspace, SHARED_REVERSE_PROXY_NETWORK);
    const composeFile = join(workspace, 'compose.yaml');
    if (!(await this.fileExists(composeFile))) {
      await writeFile(composeFile, this.traefikComposeYaml(), 'utf8');
    }
    await this.runner.run('docker', ['compose', '--project-name', TRAEFIK_PROJECT_NAME, '-f', 'compose.yaml', 'up', '-d'], { cwd: workspace });
    this.reverseProxyReady = true;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private traefikComposeYaml(): string {
    return [
      'services:',
      '  traefik:',
      '    image: traefik:v3.6',
      '    restart: unless-stopped',
      '    command:',
      '      - --providers.docker=true',
      '      - --providers.docker.exposedbydefault=false',
      '      - --providers.docker.network=kiban',
      '      - --entrypoints.web.address=:80',
      '      - --entrypoints.websecure.address=:443',
      '      - --api.dashboard=false',
      '    ports:',
      '      - "80:80"',
      '      - "443:443"',
      '    volumes:',
      '      - /var/run/docker.sock:/var/run/docker.sock:ro',
      '    networks:',
      '      - kiban',
      'networks:',
      '  kiban:',
      '    name: kiban',
      '    external: true',
      ''
    ].join('\n');
  }

  /** Parses the Traefik compose file to extract static configuration. */
  private parseTraefikCompose(composeYaml: string): { readonly version: string | null; readonly ports: readonly { readonly published: number; readonly target: number }[]; readonly entrypoints: readonly { readonly name: string; readonly address: string }[]; readonly dockerNetwork: string | null; readonly dashboard: boolean } {
    const document = this.composeDocument(composeYaml);
    const services = this.recordValue(document['services']);
    const traefik = services ? this.recordValue(services['traefik']) : null;
    if (!traefik) return { version: null, ports: [], entrypoints: [], dockerNetwork: null, dashboard: false };

    const version = typeof traefik['image'] === 'string' ? traefik['image'] : null;
    const ports = this.parseTraefikPorts(traefik['ports']);
    const command = Array.isArray(traefik['command']) ? traefik['command'] : [];
    const entrypoints = this.parseTraefikEntrypoints(command);
    const dockerNetwork = this.parseTraefikDockerNetwork(command);
    const dashboard = command.some((arg) => typeof arg === 'string' && arg.startsWith('--api.dashboard=true'));

    return { version, ports, entrypoints, dockerNetwork, dashboard };
  }

  private parseTraefikPorts(ports: unknown): readonly { readonly published: number; readonly target: number }[] {
    if (!Array.isArray(ports)) return [];
    return ports.flatMap((entry) => {
      if (typeof entry !== 'string') return [];
      const match = /(\d+):(\d+)/.exec(entry);
      if (!match || match[1] === undefined || match[2] === undefined) return [];
      return [{ published: Number(match[1]), target: Number(match[2]) }];
    });
  }

  private parseTraefikEntrypoints(command: readonly unknown[]): readonly { readonly name: string; readonly address: string }[] {
    const result: { readonly name: string; readonly address: string }[] = [];
    for (const arg of command) {
      if (typeof arg !== 'string') continue;
      const match = /--entrypoints\.([^.]+)\.address=(.+)/.exec(arg);
      if (match && match[1] !== undefined && match[2] !== undefined) result.push({ name: match[1], address: match[2] });
    }
    return result;
  }

  private parseTraefikDockerNetwork(command: readonly unknown[]): string | null {
    for (const arg of command) {
      if (typeof arg !== 'string') continue;
      const match = /--providers\.docker\.network=(.+)/.exec(arg);
      if (match && match[1] !== undefined) return match[1];
    }
    return null;
  }

  /** Collects active Traefik routers by inspecting containers on the shared network. */
  private async collectTraefikRouters(cwd: string): Promise<readonly TraefikRouter[]> {
    try {
      const { stdout: networkStdout } = await this.runner.run('docker', ['network', 'inspect', SHARED_REVERSE_PROXY_NETWORK], { cwd });
      const containerIds = this.parseNetworkContainerIds(networkStdout);
      if (containerIds.length === 0) return [];

      const { stdout: inspectStdout } = await this.runner.run('docker', ['inspect', ...containerIds], { cwd });
      return this.parseRoutersFromInspect(inspectStdout);
    } catch {
      return [];
    }
  }

  private parseNetworkContainerIds(stdout: string): readonly string[] {
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const result: string[] = [];
    for (const row of rows) {
      const record = this.recordValue(row);
      const containers = this.recordValue(record?.['Containers']);
      if (!containers) continue;
      for (const value of Object.values(containers)) {
        const container = this.recordValue(value);
        const name = container?.['Name'];
        if (typeof name === 'string') result.push(name.replace(/^\//, ''));
      }
    }
    return result;
  }

  private parseRoutersFromInspect(stdout: string): readonly TraefikRouter[] {
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const routers: TraefikRouter[] = [];
    for (const row of rows) {
      const record = this.recordValue(row);
      const name = typeof record?.['Name'] === 'string' ? record['Name'].replace(/^\//, '') : '';
      const config = this.recordValue(record?.['Config']);
      const labels = this.recordValue(config?.['Labels']);
      if (!labels) continue;
      const routerNames = this.extractRouterNames(labels);
      for (const routerName of routerNames) {
        const rule = labels[`traefik.http.routers.${routerName}.rule`];
        const entrypoint = labels[`traefik.http.routers.${routerName}.entrypoints`];
        const port = labels[`traefik.http.services.${routerName}.loadbalancer.server.port`];
        if (typeof rule === 'string') {
          routers.push({ name: routerName, rule, entrypoint: typeof entrypoint === 'string' ? entrypoint : '', service: routerName, port: typeof port === 'string' ? port : '', container: name });
        }
      }
    }
    return routers;
  }

  private extractRouterNames(labels: Record<string, unknown>): readonly string[] {
    const names = new Set<string>();
    for (const key of Object.keys(labels)) {
      const match = /traefik\.http\.routers\.([^.]+)\.rule/.exec(key);
      if (match && match[1] !== undefined) names.add(match[1]);
    }
    return [...names];
  }

  /** Adds or removes Traefik routing labels on kiban-web for the instance domain. */
  private withInstanceDomainRouting(composeYaml: string, domain: string): string {
    const document = this.composeDocument(composeYaml);
    const services = this.recordValue(document['services']);
    if (!services) return composeYaml;
    const webService = this.recordValue(services['kiban-web']);
    if (!webService) return composeYaml;

    if (domain.length === 0) {
      delete webService['labels'];
      this.removeServiceNetwork(webService, SHARED_REVERSE_PROXY_NETWORK);
      if (!('ports' in webService)) webService['ports'] = ['8080:80'];
      return stringify(document);
    }

    delete webService['ports'];
    this.addExpose(webService, 80);
    this.addServiceNetwork(webService, SHARED_REVERSE_PROXY_NETWORK);
    const labels = this.ensureRecord(webService, 'labels');
    labels['traefik.enable'] = 'true';
    labels['traefik.http.routers.kiban-web.rule'] = `Host(\`${domain}\`)`;
    labels['traefik.http.routers.kiban-web.entrypoints'] = 'web';
    labels['traefik.http.services.kiban-web.loadbalancer.server.port'] = '80';
    labels['traefik.docker.network'] = SHARED_REVERSE_PROXY_NETWORK;

    const networks = this.ensureRecord(document, 'networks');
    if (!networks[SHARED_REVERSE_PROXY_NETWORK]) {
      networks[SHARED_REVERSE_PROXY_NETWORK] = { name: SHARED_REVERSE_PROXY_NETWORK, external: true };
    }

    return stringify(document);
  }

  private composeYamlForRuntime(composeYaml: string, environmentNetworkName: string, publicEndpoints: readonly RuntimePublicEndpoint[]): string {
    const document = this.composeDocument(composeYaml);
    const services = this.recordValue(document['services']);
    if (services) {
      for (const endpoint of publicEndpoints) {
        const service = this.recordValue(services[endpoint.service]);
        if (!service) continue;
        this.removePublishedPort(service, endpoint.port);
        this.addExpose(service, endpoint.port);
        this.addServiceNetwork(service, 'default');
        this.addServiceNetwork(service, SHARED_REVERSE_PROXY_NETWORK);
        this.addTraefikLabels(service, endpoint);
      }
    }
    const networks = this.ensureRecord(document, 'networks');
    networks['default'] = { name: environmentNetworkName, external: true };
    if (publicEndpoints.length > 0) {
      networks[SHARED_REVERSE_PROXY_NETWORK] = { name: SHARED_REVERSE_PROXY_NETWORK, external: true };
    }
    return stringify(document);
  }

  private async materializeGeneratedBindFiles(workspace: string, composeYaml: string): Promise<string> {
    const document = this.composeDocument(composeYaml);
    const services = this.recordValue(document['services']);
    if (!services) return composeYaml;
    for (const rawService of Object.values(services)) {
      const service = this.recordValue(rawService);
      const volumes = Array.isArray(service?.['volumes']) ? service['volumes'] : undefined;
      if (!volumes) continue;
      for (const volume of volumes) {
        const entry = this.recordValue(volume);
        if (!entry || entry['type'] !== 'bind' || typeof entry['source'] !== 'string' || typeof entry['content'] !== 'string') continue;
        const targetPath = resolve(workspace, entry['source']);
        if (!targetPath.startsWith(resolve(workspace) + sep)) {
          throw new Error('Generated bind file source must stay inside the service workspace.');
        }
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, entry['content'], 'utf8');
        delete entry['content'];
      }
    }
    return stringify(document);
  }

  private composeDocument(composeYaml: string): Record<string, unknown> {
    const parsed = parse(composeYaml) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { services: {} };
    return parsed as Record<string, unknown>;
  }

  private recordValue(value: unknown): Record<string, unknown> | null {
    return !value || typeof value !== 'object' || Array.isArray(value) ? null : value as Record<string, unknown>;
  }

  private ensureRecord(target: Record<string, unknown>, key: string): Record<string, unknown> {
    const existing = this.recordValue(target[key]);
    if (existing) return existing;
    const created: Record<string, unknown> = {};
    target[key] = created;
    return created;
  }

  private removePublishedPort(service: Record<string, unknown>, internalPort: number): void {
    const ports = service['ports'];
    if (!Array.isArray(ports)) return;
    const kept = ports.filter((entry) => !this.portEntryTargets(entry, internalPort));
    if (kept.length > 0) service['ports'] = kept;
    else delete service['ports'];
  }

  private portEntryTargets(entry: unknown, internalPort: number): boolean {
    if (typeof entry === 'number') return entry === internalPort;
    if (typeof entry === 'string') {
      const parts = entry.split(':');
      const target = parts[parts.length - 1]?.split('/')[0] ?? '';
      return Number(target) === internalPort;
    }
    const record = this.recordValue(entry);
    if (!record) return false;
    return Number(record['target']) === internalPort || Number(record['containerPort']) === internalPort;
  }

  private addExpose(service: Record<string, unknown>, internalPort: number): void {
    const existing = Array.isArray(service['expose']) ? service['expose'].map((value) => String(value)) : [];
    const port = String(internalPort);
    service['expose'] = existing.includes(port) ? existing : [...existing, port];
  }

  private addServiceNetwork(service: Record<string, unknown>, networkName: string): void {
    const networks = service['networks'];
    if (Array.isArray(networks)) {
      if (!networks.includes(networkName)) networks.push(networkName);
      return;
    }
    if (networks && typeof networks === 'object') {
      const record = networks as Record<string, unknown>;
      if (!record[networkName]) record[networkName] = {};
      return;
    }
    service['networks'] = [networkName];
  }

  private removeServiceNetwork(service: Record<string, unknown>, networkName: string): void {
    const networks = service['networks'];
    if (Array.isArray(networks)) {
      service['networks'] = networks.filter((n) => n !== networkName);
      if ((service['networks'] as string[]).length === 0) delete service['networks'];
      return;
    }
    if (networks && typeof networks === 'object') {
      const record = networks as Record<string, unknown>;
      delete record[networkName];
      if (Object.keys(record).length === 0) delete service['networks'];
    }
  }

  private addTraefikLabels(service: Record<string, unknown>, endpoint: RuntimePublicEndpoint): void {
    const labels = this.ensureRecord(service, 'labels');
    const routerName = traefikName(`${endpoint.host}-${endpoint.service}-${endpoint.port}`);
    labels['traefik.enable'] = 'true';
    labels[`traefik.http.routers.${routerName}.rule`] = `Host(\`${endpoint.host}\`)`;
    labels[`traefik.http.routers.${routerName}.entrypoints`] = endpoint.protocol === 'https' ? 'websecure' : 'web';
    if (endpoint.protocol === 'https') labels[`traefik.http.routers.${routerName}.tls`] = 'true';
    labels[`traefik.http.services.${routerName}.loadbalancer.server.port`] = String(endpoint.port);
    labels['traefik.docker.network'] = SHARED_REVERSE_PROXY_NETWORK;
  }

  private envFile(variables: Readonly<Record<string, unknown>>): string {
    const lines = new Map<string, string>();
    for (const [key, raw] of Object.entries(variables)) {
      const resolved = resolveComposeFallback(raw);
      lines.set(key, resolved.value);
      if (resolved.variableName) lines.set(resolved.variableName, resolved.value);
    }
    return [...lines.entries()].map(([key, value]) => `${key}=${this.escapeEnvValue(value)}`).join('\n') + '\n';
  }

  private variablesWithPublicEndpoints(
    variables: Readonly<Record<string, unknown>>,
    publicEndpoints: readonly RuntimePublicEndpoint[],
    serviceId: string
  ): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = { ...variables };
    for (const endpoint of publicEndpoints) {
      for (const key of [this.serviceVariableKey(endpoint.service), this.serviceVariableKey(serviceId)]) {
        result[`SERVICE_URL_${key}`] = endpoint.url;
        result[`SERVICE_FQDN_${key}`] = endpoint.host;
        result[`SERVICE_URL_${key}_${endpoint.port}`] = endpoint.url;
      }
    }
    return result;
  }

  private serviceVariableKey(value: string): string {
    return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  private async variablesWithAvailableHostPorts(composeYaml: string, variables: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>> {
    const resolvedVariables: Record<string, unknown> = { ...variables };
    const reservedPorts = new Set<number>();
    for (const binding of this.hostPortBindings(composeYaml)) {
      const configured = this.resolveConfiguredPort(resolvedVariables[binding.variableName], binding.defaultPort);
      const assigned = await this.portAllocator.reserve(configured, reservedPorts);
      reservedPorts.add(assigned);
      resolvedVariables[binding.variableName] = String(assigned);
    }
    return resolvedVariables;
  }

  private async composeUpWithPortCollisionRetry(
    workspace: string,
    projectName: string,
    composeYaml: string,
    initialVariables: Readonly<Record<string, unknown>>,
    envFile: string
  ): Promise<Readonly<Record<string, unknown>>> {
    let variables: Readonly<Record<string, unknown>> = initialVariables;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await this.compose(workspace, projectName, ['up', '-d']);
        return variables;
      } catch (error) {
        const occupiedPort = this.occupiedPortFromError(error);
        if (!occupiedPort) throw error;
        const nextVariables = await this.reassignOccupiedHostPort(composeYaml, variables, occupiedPort);
        if (nextVariables === variables) throw error;
        variables = nextVariables;
        await writeFile(envFile, this.envFile(variables), 'utf8');
      }
    }
    throw new Error('Docker Compose could not start the service because host port allocation kept colliding.');
  }

  private occupiedPortFromError(error: unknown): number | null {
    const message = error instanceof Error ? error.message : String(error);
    const match = DOCKER_PORT_COLLISION_PATTERN.exec(message);
    if (!match) return null;
    const port = Number(match[1]);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
  }

  private async reassignOccupiedHostPort(
    composeYaml: string,
    variables: Readonly<Record<string, unknown>>,
    occupiedPort: number
  ): Promise<Readonly<Record<string, unknown>>> {
    const bindings = this.hostPortBindings(composeYaml);
    const variableName = bindings.find((binding) => this.resolveConfiguredPort(variables[binding.variableName], binding.defaultPort) === occupiedPort)?.variableName;
    if (!variableName) return variables;
    const alreadyReserved = new Set<number>(bindings
      .map((binding) => this.resolveConfiguredPort(variables[binding.variableName], binding.defaultPort))
      .filter((port) => port !== occupiedPort));
    const replacement = await this.portAllocator.reserve(occupiedPort + 1, alreadyReserved);
    return { ...variables, [variableName]: String(replacement) };
  }

  private hostPortBindings(composeYaml: string): readonly { readonly variableName: string; readonly defaultPort: number }[] {
    const matches: { readonly variableName: string; readonly defaultPort: number }[] = [];
    for (const match of composeYaml.matchAll(COMPOSE_HOST_PORT_PATTERN)) {
      const variableName = match[1];
      const defaultPort = Number(match[2]);
      if (variableName && Number.isInteger(defaultPort) && defaultPort > 0 && defaultPort <= 65535) {
        matches.push({ variableName, defaultPort });
      }
    }
    return matches;
  }

  private resolveConfiguredPort(value: unknown, defaultPort: number): number {
    const resolved = value === undefined ? String(defaultPort) : resolveComposeFallback(value).value;
    const parsed = Number(resolved);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : defaultPort;
  }

  private escapeEnvValue(value: string): string {
    if (!/[\s#'"\\]/.test(value)) return value;
    return JSON.stringify(value);
  }

  private compose(cwd: string, projectName: string, args: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string }> {
    return this.runner.run('docker', ['compose', '--project-name', projectName, '--env-file', '.env', '-f', 'compose.yaml', ...args], { cwd });
  }

  private composeFromService(service: InstalledService, args: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const cwd = this.runtimeString(service, 'workingDirectory');
    const projectName = this.runtimeString(service, 'projectName');
    return this.compose(cwd, projectName, args);
  }

  private async removeWorkspace(service: InstalledService): Promise<void> {
    const cwd = this.runtimeString(service, 'workingDirectory');
    const workspace = resolve(cwd);
    const root = resolve(this.runtimeRoot);
    if (workspace !== root && workspace.startsWith(`${root}${sep}`)) {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  private async refreshRuntime(service: InstalledService): Promise<Readonly<Record<string, unknown>>> {
    const cwd = this.runtimeString(service, 'workingDirectory');
    const projectName = this.runtimeString(service, 'projectName');
    const containers = await this.ps(cwd, projectName);
    const health = await this.runtimeHealth(containers, this.runtimePublicEndpoints(service.runtime));
    return { ...(service.runtime ?? {}), containers, health: health.status, healthSource: health.source, healthCheckedAt: health.checkedAt, healthMessage: health.message, status: containers.some((container) => container.status === 'running') ? 'running' : 'stopped' };
  }

  private async runtimeHealth(containers: readonly ComposeContainerInfo[], publicEndpoints: readonly RuntimePublicEndpoint[]): Promise<{ readonly status: 'healthy' | 'unhealthy' | 'unknown'; readonly source: string; readonly checkedAt: string; readonly message: string }> {
    const containerHealth = this.containerHealth(containers);
    const checkedAt = new Date().toISOString();
    if (containerHealth === 'unhealthy') return { status: 'unhealthy', source: 'container', checkedAt, message: 'One or more runtime units are not running or reported unhealthy.' };
    let publicEndpointsReachable = true;
    if (publicEndpoints.length > 0) {
      const reachable = await Promise.all(publicEndpoints.map((endpoint) => this.webHealthChecker.isReachable(endpoint.url)));
      publicEndpointsReachable = reachable.every(Boolean);
    }
    if (containerHealth === 'unknown') return { status: 'unknown', source: 'runtime', checkedAt, message: 'Runtime units are running but no healthcheck information is available.' };
    if (publicEndpoints.length > 0 && !publicEndpointsReachable) return { status: 'healthy', source: 'container', checkedAt, message: 'Runtime units reported healthy. Public URLs could not be verified from this Kiban instance.' };
    return { status: 'healthy', source: 'container', checkedAt, message: publicEndpoints.length > 0 ? 'Runtime units reported healthy and web access URLs are reachable.' : 'Runtime units reported healthy.' };
  }

  private containerHealth(containers: readonly ComposeContainerInfo[]): 'healthy' | 'unhealthy' | 'unknown' {
    if (containers.length === 0) return 'unknown';
    if (containers.some((container) => container.status !== 'running' || container.health === 'unhealthy')) return 'unhealthy';
    if (containers.every((container) => container.health === 'healthy')) return 'healthy';
    return 'unknown';
  }

  private runtimePublicEndpoints(runtime: Readonly<Record<string, unknown>> | null): readonly RuntimePublicEndpoint[] {
    const publicEndpoints = runtime?.['publicEndpoints'];
    if (!Array.isArray(publicEndpoints)) return [];
    return publicEndpoints.flatMap((endpoint) => {
      const record = this.recordValue(endpoint);
      if (!record) return [];
      const name = record['name'];
      const service = record['service'];
      const port = record['port'];
      const host = record['host'];
      const url = record['url'];
      const protocol = record['protocol'];
      if (typeof name !== 'string' || typeof service !== 'string' || typeof port !== 'number' || typeof host !== 'string' || typeof url !== 'string') return [];
      if (protocol !== 'http' && protocol !== 'https') return [];
      return [{ name, service, port, host, url, protocol }];
    });
  }

  private runtimeString(service: InstalledService, key: string): string {
    const value = service.runtime?.[key];
    if (typeof value !== 'string' || value.length === 0) throw new Error(`Installed service does not have Docker Compose runtime metadata: ${key}.`);
    return value;
  }

  private async ps(cwd: string, projectName: string): Promise<readonly ComposeContainerInfo[]> {
    const { stdout } = await this.compose(cwd, projectName, ['ps', '-a', '--format', 'json']);
    return this.withInspectedHealth(cwd, this.parsePs(stdout));
  }

  private async withInspectedHealth(cwd: string, containers: readonly ComposeContainerInfo[]): Promise<readonly ComposeContainerInfo[]> {
    const unknown = containers.filter((container) => container.health === 'unknown' && container.id.length > 0);
    if (unknown.length === 0) return containers;
    try {
      const { stdout } = await this.runner.run('docker', ['inspect', ...unknown.map((container) => container.id)], { cwd });
      const healthById = this.parseInspectHealth(stdout);
      return containers.map((container) => ({ ...container, health: healthById[container.id] ?? container.health }));
    } catch {
      return containers;
    }
  }

  private parseInspectHealth(stdout: string): Readonly<Record<string, string>> {
    const trimmed = stdout.trim();
    if (!trimmed) return {};
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const result: Record<string, string> = {};
    for (const row of rows) {
      const record = this.recordValue(row);
      const state = this.recordValue(record?.['State']);
      const health = this.recordValue(state?.['Health']);
      const id = typeof record?.['Id'] === 'string' ? record['Id'] : '';
      const status = typeof health?.['Status'] === 'string' ? health['Status'] : '';
      if (id.length > 0 && status.length > 0) result[id] = status;
    }
    return result;
  }

  private parsePs(stdout: string): readonly ComposeContainerInfo[] {
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = this.parseComposeJsonOutput(trimmed);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.flatMap((row) => this.parsePsRow(row));
  }

  private parseComposeJsonOutput(stdout: string): unknown {
    try {
      return JSON.parse(stdout) as unknown;
    } catch (error) {
      const rows = stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
      if (rows.length <= 1) throw error;
      return rows.map((line) => JSON.parse(line) as unknown);
    }
  }

  private parsePsRow(row: unknown): readonly ComposeContainerInfo[] {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const record = row as Readonly<Record<string, unknown>>;
    const publishers = Array.isArray(record['Publishers']) ? record['Publishers'] : [];
    return [{
      id: this.stringField(record, 'ID'),
      name: this.stringField(record, 'Service') || this.stringField(record, 'Name'),
      status: this.stringField(record, 'State') || 'unknown',
      health: this.stringField(record, 'Health') || 'unknown',
      image: this.stringField(record, 'Image'),
      restartCount: 0,
      assignedPorts: publishers.flatMap((publisher) => this.parsePublisher(publisher))
    }];
  }

  private parsePublisher(value: unknown): readonly Record<string, string | number>[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const record = value as Readonly<Record<string, unknown>>;
    const target = typeof record['TargetPort'] === 'number' ? record['TargetPort'] : Number(record['TargetPort']);
    const published = typeof record['PublishedPort'] === 'number' ? record['PublishedPort'] : Number(record['PublishedPort']);
    const protocol = typeof record['Protocol'] === 'string' ? record['Protocol'] : 'tcp';
    if (!Number.isFinite(target) || !Number.isFinite(published)) return [];
    return [{ containerPort: `${target}/${protocol}`, hostIp: this.stringField(record, 'URL') || '0.0.0.0', hostPort: String(published) }];
  }

  private stringField(record: Readonly<Record<string, unknown>>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
  }
}
