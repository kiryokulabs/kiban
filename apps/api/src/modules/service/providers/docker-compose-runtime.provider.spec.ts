import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import type { Environment, InstallationPlan, InstalledService, ServiceDefinition } from '@kiban/core';
import { DockerComposeRuntimeProvider, type ComposeCommandRunner, type HostPortAllocator } from './docker-compose-runtime.provider';

const definition: ServiceDefinition = {
  id: 'mongo-express',
  metadata: { id: 'mongo-express', name: 'Mongo Express', description: 'UI', category: 'development', author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [] },
  composeYaml: `services:\n  mongo-express:\n    image: mongo-express:latest\n    environment:\n      ME_CONFIG_MONGODB_URL: \${KIBAN_MONGOEXPRESS_MONGODB_URL:-mongodb://admin:kiban@mongo:27017/}\n`,
  runtime: { services: [{ name: 'mongo-express', image: 'mongo-express', tag: 'latest', ports: [{ port: 8081, protocol: 'tcp' }], environment: [], volumes: [], restart: 'unless-stopped', dependsOn: [], labels: {} }] },
  schema: {},
  icon: '<svg />',
  sourcePath: '/catalog/development/mongo-express'
};

const environment: Environment = { id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: new Date('2026-08-01T10:00:00.000Z'), updatedAt: new Date('2026-08-01T10:00:00.000Z') };
const plan: InstallationPlan = { serviceDefinition: definition, environment, variables: { KIBAN_MONGOEXPRESS_MONGODB_URL: 'mongodb://admin:kiban@mongo:27017/' } };
const routedPlan: InstallationPlan = {
  ...plan,
  serviceDefinition: {
    ...definition,
    metadata: { ...definition.metadata, accessPoints: [{ name: 'Web UI', kind: 'web', service: 'mongo-express', port: 8081 }] },
    composeYaml: `services:\n  mongo-express:\n    image: mongo-express:latest\n    ports:\n      - "\${KIBAN_MONGOEXPRESS_PORT:-8081}:8081"\n`
  },
  variables: { KIBAN_MONGOEXPRESS_PORT: '8081' },
  publicEndpoints: [{ name: 'Web UI', service: 'mongo-express', port: 8081, host: 'mongo-express.development.crossmetrics.localhost', url: 'http://mongo-express.development.crossmetrics.localhost', protocol: 'http' }]
};

class FakeRunner implements ComposeCommandRunner {
  public readonly calls: { readonly command: string; readonly args: readonly string[]; readonly cwd: string }[] = [];
  public async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.calls.push({ command, args, cwd: options.cwd });
    if (args.includes('network') && args.includes('inspect')) return { stdout: '[]', stderr: '' };
    if (args.includes('network') && args.includes('create')) return { stdout: 'network-id', stderr: '' };
    if (args.includes('version')) return { stdout: 'Docker Compose version v2.30.0', stderr: '' };
    if (args.includes('ps')) return { stdout: JSON.stringify([{ ID: 'container-1', Name: 'kiban-env-1-mongo-express-1', Service: 'mongo-express', State: 'running', Health: 'healthy', Publishers: [{ URL: '0.0.0.0', TargetPort: 8081, PublishedPort: 49153, Protocol: 'tcp' }] }]), stderr: '' };
    if (args.includes('logs')) return { stdout: 'ready', stderr: '' };
    return { stdout: '', stderr: '' };
  }
}

class PortCollisionRunner extends FakeRunner {
  private upCalls = 0;

  public override async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.calls.push({ command, args, cwd: options.cwd });
    if (args.includes('up') && !options.cwd.includes('traefik')) {
      this.upCalls += 1;
      if (this.upCalls === 1) {
        throw new Error('Error response from daemon: Bind for 0.0.0.0:3001 failed: port is already allocated');
      }
      return { stdout: '', stderr: '' };
    }
    if (args.includes('ps')) return { stdout: JSON.stringify([{ ID: 'container-1', Name: 'kiban-env-1-supabase-1', Service: 'supabase', State: 'running', Health: 'healthy', Publishers: [{ URL: '0.0.0.0', TargetPort: 3000, PublishedPort: 49155, Protocol: 'tcp' }] }]), stderr: '' };
    return super.run(command, args, options);
  }
}

class JsonLinesPsRunner extends FakeRunner {
  public override async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.calls.push({ command, args, cwd: options.cwd });
    if (args.includes('ps')) {
      return {
        stdout: [
          JSON.stringify({ ID: 'container-1', Name: 'service-a-1', Service: 'service-a', State: 'running', Health: 'healthy', Publishers: [{ URL: '0.0.0.0', TargetPort: 3000, PublishedPort: 49155, Protocol: 'tcp' }] }),
          JSON.stringify({ ID: 'container-2', Name: 'service-b-1', Service: 'service-b', State: 'running', Health: 'healthy', Publishers: [] })
        ].join('\n'),
        stderr: ''
      };
    }
    return super.run(command, args, options);
  }
}

class FakePortAllocator implements HostPortAllocator {
  public constructor(private readonly replacements: Readonly<Record<number, number>> = {}) {}

  public async reserve(preferredPort: number): Promise<number> {
    return this.replacements[preferredPort] ?? preferredPort;
  }
}

const installed = (runtime: Readonly<Record<string, unknown>>): InstalledService => ({ id: 'installed-1', environmentId: 'env-1', serviceId: 'mongo-express', name: 'Mongo Express', status: 'running', configuration: {}, runtime, createdAt: new Date(), updatedAt: new Date() });

describe('DockerComposeRuntimeProvider', () => {
  it('bootstraps the shared Kiban reverse proxy before installing services', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), 'services');
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());

    await provider.install(plan);

    const traefikWorkspace = runner.calls.find((call) => call.cwd.includes('traefik'))?.cwd;
    expect(traefikWorkspace).toBeDefined();
    const traefikComposeYaml = await readFile(join(traefikWorkspace!, 'compose.yaml'), 'utf8');
    expect(traefikComposeYaml).toContain('image: traefik:v3.6');
    expect(traefikComposeYaml).not.toContain('DOCKER_API_VERSION');
    expect(runner.calls.some((call) => call.args.join(' ') === 'network inspect kiban')).toBe(true);
    expect(runner.calls.some((call) => call.args.join(' ') === 'network create kiban')).toBe(false);
    expect(runner.calls.some((call) => call.cwd.includes('traefik') && call.args.includes('up') && call.args.includes('-d'))).toBe(true);
  });

  it('does not overwrite an existing Kiban reverse proxy compose file on startup', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), 'services');
    const traefikRoot = join(root, '..', 'traefik');
    await mkdir(traefikRoot, { recursive: true });
    await writeFile(join(traefikRoot, 'compose.yaml'), 'services:\n  traefik:\n    image: traefik:v3.6\n    command:\n      - --custom-user-setting=true\n', 'utf8');
    const provider = DockerComposeRuntimeProvider.withRunner(new FakeRunner(), root, new FakePortAllocator());

    await provider.install(plan);

    await expect(readFile(join(traefikRoot, 'compose.yaml'), 'utf8')).resolves.toContain('--custom-user-setting=true');
  });

  it('routes HTTP services through Traefik instead of publishing host ports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());

    const result = await provider.install(routedPlan);

    const composeYaml = await readFile(join(String(result.runtime?.['workingDirectory']), 'compose.yaml'), 'utf8');
    expect(composeYaml).not.toContain('${KIBAN_MONGOEXPRESS_PORT:-8081}:8081');
    expect(composeYaml).toContain('expose:');
    expect(composeYaml).toContain('8081');
    expect(composeYaml).toContain('traefik.enable');
    expect(composeYaml).toContain('Host(`mongo-express.development.crossmetrics.localhost`)');
    expect(composeYaml).toContain('traefik.http.services.mongo-express-development-crossmetrics-localhost-mongo-express-8081.loadbalancer.server.port');
    expect(composeYaml).toContain('name: kiban');
    expect(result.runtime?.['publicEndpoints']).toEqual(routedPlan.publicEndpoints);
  });

  it('keeps non-web host ports untouched for services that intentionally expose TCP access', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());
    const postgresDefinition: ServiceDefinition = {
      ...definition,
      id: 'postgres',
      metadata: { ...definition.metadata, accessPoints: [{ name: 'Database', kind: 'postgres', service: 'postgres', port: 5432 }] },
      composeYaml: `services:\n  postgres:\n    image: postgres:16\n    ports:\n      - "\${KIBAN_POSTGRES_PORT:-5432}:5432"\n`
    };

    const result = await provider.install({ ...plan, serviceDefinition: postgresDefinition, variables: { KIBAN_POSTGRES_PORT: '5432' } });

    const composeYaml = await readFile(join(String(result.runtime?.['workingDirectory']), 'compose.yaml'), 'utf8');
    expect(composeYaml).toContain('${KIBAN_POSTGRES_PORT:-5432}:5432');
    expect(composeYaml).not.toContain('traefik.enable');
  });

  it('registers HTTPS public endpoints on Traefik websecure with TLS enabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());

    const result = await provider.install({
      ...routedPlan,
      publicEndpoints: [{ name: 'Web UI', service: 'mongo-express', port: 8081, host: 'mongo-express.development.crossmetrics.localhost', url: 'https://mongo-express.development.crossmetrics.localhost', protocol: 'https' }]
    });

    const composeYaml = await readFile(join(String(result.runtime?.['workingDirectory']), 'compose.yaml'), 'utf8');
    expect(composeYaml).toContain('entrypoints: websecure');
    expect(composeYaml).toContain('tls: "true"');
  });

  it('writes compose.yaml and .env, then runs docker compose up', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());

    const result = await provider.install(plan);

    expect(result.status).toBe('running');
    expect(result.runtime).toMatchObject({ provider: 'docker-compose', projectName: 'kiban-env-1-mongo-express' });
    const workingDirectory = String(result.runtime?.['workingDirectory']);
    await expect(readFile(join(workingDirectory, 'compose.yaml'), 'utf8')).resolves.toContain('mongo-express:latest');
    await expect(readFile(join(workingDirectory, '.env'), 'utf8')).resolves.toContain('KIBAN_MONGOEXPRESS_MONGODB_URL=mongodb://admin:kiban@mongo:27017/');
    expect(runner.calls.some((call) => call.args.includes('up') && call.args.includes('-d'))).toBe(true);
  });

  it('uses one external default network per environment instead of creating a Compose network per service', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());

    const result = await provider.install(plan);

    const workingDirectory = String(result.runtime?.['workingDirectory']);
    const composeYaml = await readFile(join(workingDirectory, 'compose.yaml'), 'utf8');
    expect(composeYaml).toContain('networks:');
    expect(composeYaml).toContain('default:');
    expect(composeYaml).toContain('external: true');
    expect(composeYaml).toContain('name: kiban-env-env-1');
    expect(result.runtime).toMatchObject({ networkName: 'kiban-env-env-1' });
    expect(runner.calls.some((call) => call.command === 'docker' && call.args.join(' ') === 'network inspect kiban-env-env-1')).toBe(true);
  });

  it('derives env-file variables from legacy schema values that still contain compose placeholders', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator());
    const legacyPlan: InstallationPlan = { ...plan, variables: { ME_CONFIG_MONGODB_URL: '${KIBAN_MONGOEXPRESS_MONGODB_URL:-mongodb://admin:kiban@mongo:27017/}' } };

    const result = await provider.install(legacyPlan);

    const envFile = await readFile(join(String(result.runtime?.['workingDirectory']), '.env'), 'utf8');
    expect(envFile).toContain('KIBAN_MONGOEXPRESS_MONGODB_URL=mongodb://admin:kiban@mongo:27017/');
  });

  it('overrides occupied compose host ports through the generated env file before running compose', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator({ 3000: 49154 }));
    const giteaDefinition: ServiceDefinition = {
      ...definition,
      id: 'gitea',
      composeYaml: `services:\n  gitea:\n    image: gitea/gitea:latest\n    ports:\n      - "\${KIBAN_GITEA_PORT:-3000}:3000"\n`,
      runtime: { services: [{ name: 'gitea', image: 'gitea/gitea', tag: 'latest', ports: [{ port: 3000, protocol: 'tcp' }], environment: [], volumes: [], restart: 'unless-stopped', dependsOn: [], labels: {} }] }
    };

    const result = await provider.install({ ...plan, serviceDefinition: giteaDefinition, variables: { KIBAN_GITEA_PORT: '3000' } });

    const envFile = await readFile(join(String(result.runtime?.['workingDirectory']), '.env'), 'utf8');
    expect(envFile).toContain('KIBAN_GITEA_PORT=49154');
    expect(runner.calls.some((call) => call.args.includes('up') && call.args.includes('-d'))).toBe(true);
  });

  it('rewrites host ports and retries when Docker reports a port collision during compose up', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const runner = new PortCollisionRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, root, new FakePortAllocator({ 3002: 49155 }));
    const supabaseDefinition: ServiceDefinition = {
      ...definition,
      id: 'supabase',
      composeYaml: `services:\n  supabase:\n    image: supabase/studio:latest\n    ports:\n      - "\${KIBAN_SUPABASE_PORT:-3000}:3000"\n`
    };

    const result = await provider.install({ ...plan, serviceDefinition: supabaseDefinition, variables: { KIBAN_SUPABASE_PORT: '3001' } });

    const envFile = await readFile(join(String(result.runtime?.['workingDirectory']), '.env'), 'utf8');
    expect(envFile).toContain('KIBAN_SUPABASE_PORT=49155');
    expect(runner.calls.filter((call) => call.args.includes('up') && !call.cwd.includes('traefik')).length).toBe(2);
    expect(result.status).toBe('running');
  });

  it('parses Docker Compose ps JSON lines output for multi-container services', async () => {
    const provider = DockerComposeRuntimeProvider.withRunner(new JsonLinesPsRunner(), await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), new FakePortAllocator());

    const result = await provider.install(plan);

    expect(result.status).toBe('running');
    expect(result.runtime?.['containers']).toEqual([
      { id: 'container-1', name: 'service-a', status: 'running', health: 'healthy', image: '', restartCount: 0, assignedPorts: [{ containerPort: '3000/tcp', hostIp: '0.0.0.0', hostPort: '49155' }] },
      { id: 'container-2', name: 'service-b', status: 'running', health: 'healthy', image: '', restartCount: 0, assignedPorts: [] }
    ]);
  });

  it('maps compose ps output into runtime container metadata and access ports', async () => {
    const provider = DockerComposeRuntimeProvider.withRunner(new FakeRunner(), await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), new FakePortAllocator());
    const result = await provider.install(plan);
    expect(result.runtime?.['containers']).toEqual([{ id: 'container-1', name: 'mongo-express', status: 'running', health: 'healthy', image: '', restartCount: 0, assignedPorts: [{ containerPort: '8081/tcp', hostIp: '0.0.0.0', hostPort: '49153' }] }]);
  });

  it('runs lifecycle commands from persisted runtime metadata', async () => {
    const runner = new FakeRunner();
    const provider = DockerComposeRuntimeProvider.withRunner(runner, await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), new FakePortAllocator());
    const runtime = (await provider.install(plan)).runtime!;
    const service = installed(runtime);

    await provider.stop(service);
    await provider.start(service);
    await provider.restart(service);
    await provider.uninstall(service);
    await expect(provider.getLogs(service)).resolves.toBe('ready');

    expect(runner.calls.some((call) => call.args.includes('stop'))).toBe(true);
    expect(runner.calls.some((call) => call.args.includes('start'))).toBe(true);
    expect(runner.calls.some((call) => call.args.includes('restart'))).toBe(true);
    expect(runner.calls.some((call) => call.args.includes('down') && call.args.includes('-v'))).toBe(true);
    expect(runner.calls.some((call) => call.args.includes('logs') && call.args.includes('--no-color'))).toBe(true);
  });

  it('removes the service runtime workspace after uninstalling the compose project', async () => {
    const provider = DockerComposeRuntimeProvider.withRunner(new FakeRunner(), await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), new FakePortAllocator());
    const runtime = (await provider.install(plan)).runtime!;
    const workingDirectory = String(runtime['workingDirectory']);

    await provider.uninstall(installed(runtime));

    await expect(access(workingDirectory)).rejects.toThrow();
  });

  it('rewrites the runtime .env file when installing again with new configuration values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-'));
    const provider = DockerComposeRuntimeProvider.withRunner(new FakeRunner(), root, new FakePortAllocator());
    const first = await provider.install(plan);
    const envFile = join(String(first.runtime?.['workingDirectory']), '.env');
    await writeFile(envFile, 'KIBAN_MONGOEXPRESS_MONGODB_URL=old-value\n', 'utf8');

    await provider.install({ ...plan, variables: { KIBAN_MONGOEXPRESS_MONGODB_URL: 'mongodb://new-user:new-pass@mongo:27017/' } });

    await expect(readFile(envFile, 'utf8')).resolves.toContain('KIBAN_MONGOEXPRESS_MONGODB_URL=mongodb://new-user:new-pass@mongo:27017/');
  });

  it('reports Docker Compose diagnostics', async () => {
    await expect(DockerComposeRuntimeProvider.withRunner(new FakeRunner(), await mkdtemp(join(tmpdir(), 'kiban-compose-runtime-')), new FakePortAllocator()).diagnostics()).resolves.toMatchObject({ dockerInstalled: true, dockerRunning: true, availableRuntimes: ['docker-compose'] });
  });
});
