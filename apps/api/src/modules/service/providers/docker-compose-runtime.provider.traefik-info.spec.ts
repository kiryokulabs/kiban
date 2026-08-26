import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DockerComposeRuntimeProvider } from './docker-compose-runtime.provider.js';

const TEST_ROOT = `/tmp/kiban-test-traefik-info-${process.pid}`;

class FakeRunner {
  public responses = new Map<string, { readonly stdout: string; readonly stderr: string }>();
  public readonly commands: { readonly command: string; readonly args: readonly string[]; readonly cwd: string }[] = [];

  public async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.commands.push({ command, args, cwd: options.cwd });
    const key = `${command} ${args.join(' ')}`;
    const response = this.responses.get(key);
    if (response) return response;
    return { stdout: '', stderr: '' };
  }

  public setResponse(key: string, stdout: string): void {
    this.responses.set(key, { stdout, stderr: '' });
  }
}

const TRAEFIK_COMPOSE = `services:
  traefik:
    image: traefik:v3.6
    restart: unless-stopped
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=kiban
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --api.dashboard=false
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - kiban
networks:
  kiban:
    name: kiban
    external: true
`;

const TRAEFIK_PS_RUNNING = JSON.stringify({
  ID: 'abc123',
  Name: 'kiban-traefik-traefik-1',
  Service: 'traefik',
  State: 'running',
  Health: 'healthy',
  Image: 'traefik:v3.6',
  Publishers: [
    { TargetPort: 80, PublishedPort: 80, Protocol: 'tcp', URL: '0.0.0.0' },
    { TargetPort: 443, PublishedPort: 443, Protocol: 'tcp', URL: '0.0.0.0' }
  ]
});

const TRAEFIK_PS_STOPPED = JSON.stringify({
  ID: 'abc123',
  Name: 'kiban-traefik-traefik-1',
  Service: 'traefik',
  State: 'exited',
  Health: '',
  Image: 'traefik:v3.6',
  Publishers: []
});

const ROUTER_INSPECT = JSON.stringify([
  {
    Id: 'container-web-123',
    Name: '/kiban-kiban-web-1',
    Config: {
      Labels: {
        'traefik.enable': 'true',
        'traefik.http.routers.kiban-web.rule': 'Host(`kiban.example.com`)',
        'traefik.http.routers.kiban-web.entrypoints': 'web',
        'traefik.http.services.kiban-web.loadbalancer.server.port': '80',
        'traefik.docker.network': 'kiban'
      }
    },
    NetworkSettings: {
      Networks: {
        'kiban': { IPAddress: '172.18.0.3' }
      }
    }
  },
  {
    Id: 'container-service-456',
    Name: '/kiban-env-abc-plausible-1',
    Config: {
      Labels: {
        'traefik.enable': 'true',
        'traefik.http.routers.plausible-production-mysite-localhost.rule': 'Host(`plausible.production.mysite.localhost`)',
        'traefik.http.routers.plausible-production-mysite-localhost.entrypoints': 'web',
        'traefik.http.services.plausible-production-mysite-localhost.loadbalancer.server.port': '3000',
        'traefik.docker.network': 'kiban'
      }
    },
    NetworkSettings: {
      Networks: {
        'kiban': { IPAddress: '172.18.0.5' }
      }
    }
  }
]);

const setupTraefik = (runtimeRoot: string) => {
  const traefikDir = join(resolve(runtimeRoot), '..', 'traefik');
  mkdirSync(traefikDir, { recursive: true });
  writeFileSync(join(traefikDir, 'compose.yaml'), TRAEFIK_COMPOSE);
  return traefikDir;
};

describe('DockerComposeRuntimeProvider — getTraefikInfo', () => {
  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('returns not-installed when traefik compose does not exist', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    mkdirSync(runtimeRoot, { recursive: true });

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const info = await provider.getTraefikInfo();

    expect(info.status).toBe('not-installed');
  });

  it('returns running status with config when traefik is running', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupTraefik(runtimeRoot);
    runner.setResponse('docker compose --project-name kiban-traefik -f compose.yaml ps -a --format json', TRAEFIK_PS_RUNNING);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const info = await provider.getTraefikInfo();

    expect(info.status).toBe('running');
    expect(info.version).toBe('traefik:v3.6');
    expect(info.ports).toEqual([{ published: 80, target: 80 }, { published: 443, target: 443 }]);
    expect(info.entrypoints).toEqual([{ name: 'web', address: ':80' }, { name: 'websecure', address: ':443' }]);
    expect(info.dockerNetwork).toBe('kiban');
    expect(info.dashboard).toBe(false);
  });

  it('returns stopped status when traefik container is exited', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupTraefik(runtimeRoot);
    runner.setResponse('docker compose --project-name kiban-traefik -f compose.yaml ps -a --format json', TRAEFIK_PS_STOPPED);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const info = await provider.getTraefikInfo();

    expect(info.status).toBe('stopped');
  });

  it('returns active routers from container labels on the kiban network', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupTraefik(runtimeRoot);
    runner.setResponse('docker compose --project-name kiban-traefik -f compose.yaml ps -a --format json', TRAEFIK_PS_RUNNING);
    runner.setResponse('docker network inspect kiban', JSON.stringify({
      Containers: {
        'container-web-123': { Name: 'kiban-kiban-web-1' },
        'container-service-456': { Name: 'kiban-env-abc-plausible-1' }
      }
    }));
    runner.setResponse('docker inspect kiban-kiban-web-1 kiban-env-abc-plausible-1', ROUTER_INSPECT);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const info = await provider.getTraefikInfo();

    expect(info.routers).toHaveLength(2);
    expect(info.routers).toContainEqual({
      name: 'kiban-web',
      rule: 'Host(`kiban.example.com`)',
      entrypoint: 'web',
      service: 'kiban-web',
      port: '80',
      container: 'kiban-kiban-web-1'
    });
    expect(info.routers).toContainEqual({
      name: 'plausible-production-mysite-localhost',
      rule: 'Host(`plausible.production.mysite.localhost`)',
      entrypoint: 'web',
      service: 'plausible-production-mysite-localhost',
      port: '3000',
      container: 'kiban-env-abc-plausible-1'
    });
  });

  it('returns empty routers when no containers have traefik labels', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupTraefik(runtimeRoot);
    runner.setResponse('docker compose --project-name kiban-traefik -f compose.yaml ps -a --format json', TRAEFIK_PS_RUNNING);
    runner.setResponse('docker network inspect kiban', JSON.stringify({ Containers: {} }));

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const info = await provider.getTraefikInfo();

    expect(info.routers).toEqual([]);
  });
});
