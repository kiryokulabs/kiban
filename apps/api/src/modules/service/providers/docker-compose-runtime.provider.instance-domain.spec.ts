import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { DockerComposeRuntimeProvider } from './docker-compose-runtime.provider.js';

const TEST_ROOT = `/tmp/kiban-test-instance-domain-${process.pid}`;

class FakeRunner {
  public readonly commands: { readonly command: string; readonly args: readonly string[]; readonly cwd: string }[] = [];

  public async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.commands.push({ command, args, cwd: options.cwd });
    return { stdout: '', stderr: '' };
  }
}

const KIBAN_CORE_COMPOSE = `name: kiban

services:
  kiban-api:
    image: ghcr.io/kiryokulabs/kiban-api:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    expose:
      - "3000"
    networks:
      - kiban-core

  kiban-web:
    image: ghcr.io/kiryokulabs/kiban-web:latest
    restart: unless-stopped
    depends_on:
      - kiban-api
    environment:
      KIBAN_API_URL: http://kiban-api:3000
    ports:
      - "8080:80"
    networks:
      - kiban-core

networks:
  kiban-core:
    name: kiban-core
`;

const setupKibanCore = (runtimeRoot: string) => {
  const kibanDir = join(resolve(runtimeRoot), '..', 'kiban');
  mkdirSync(kibanDir, { recursive: true });
  writeFileSync(join(kibanDir, 'compose.yaml'), KIBAN_CORE_COMPOSE);
  writeFileSync(join(kibanDir, '.env'), 'KIBAN_VERSION=latest\n');
  return kibanDir;
};

describe('DockerComposeRuntimeProvider — applyInstanceDomain', () => {
  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('adds Traefik labels and shared network to kiban-web when domain is set', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    const kibanDir = setupKibanCore(runtimeRoot);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    await provider.applyInstanceDomain('kiban.example.com');

    const composeContent = readFileSync(join(kibanDir, 'compose.yaml'), 'utf8');
    const document = parse(composeContent) as { services: Record<string, Record<string, unknown>>; networks: Record<string, unknown> };

    const webService = document.services['kiban-web']!;
    const labels = webService.labels as Record<string, string>;

    expect(labels['traefik.enable']).toBe('true');
    expect(labels['traefik.http.routers.kiban-web.rule']).toBe('Host(`kiban.example.com`)');
    expect(labels['traefik.http.routers.kiban-web.entrypoints']).toBe('web');
    expect(labels['traefik.http.services.kiban-web.loadbalancer.server.port']).toBe('80');
    expect(labels['traefik.docker.network']).toBe('kiban');

    const networks = webService.networks as string[];
    expect(networks).toContain('kiban-core');
    expect(networks).toContain('kiban');
  });

  it('recreates the kiban core compose with --force-recreate after applying labels', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupKibanCore(runtimeRoot);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    await provider.applyInstanceDomain('kiban.example.com');

    const upCommand = runner.commands.find((c) => c.args.includes('up') && c.args.includes('-d') && c.args.includes('--force-recreate'));
    expect(upCommand).toBeDefined();
  });

  it('removes Traefik labels when domain is cleared', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    const kibanDir = setupKibanCore(runtimeRoot);

    const composeWithLabels = KIBAN_CORE_COMPOSE.replace(
      '    ports:\n      - "8080:80"\n    networks:\n      - kiban-core',
      '    expose:\n      - "80"\n    labels:\n      traefik.enable: "true"\n      traefik.http.routers.kiban-web.rule: "Host(`kiban.example.com`)"\n      traefik.http.routers.kiban-web.entrypoints: web\n      traefik.http.services.kiban-web.loadbalancer.server.port: "80"\n      traefik.docker.network: kiban\n    networks:\n      - kiban-core\n      - kiban'
    );
    writeFileSync(join(kibanDir, 'compose.yaml'), composeWithLabels);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    await provider.applyInstanceDomain('');

    const composeContent = readFileSync(join(kibanDir, 'compose.yaml'), 'utf8');
    const document = parse(composeContent) as { services: Record<string, Record<string, unknown>> };

    const webService = document.services['kiban-web']!;
    expect(webService.labels).toBeUndefined();
    expect(webService.ports).toBeDefined();
  });

  it('returns false when kiban core compose does not exist', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    mkdirSync(runtimeRoot, { recursive: true });

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const result = await provider.applyInstanceDomain('kiban.example.com');

    expect(result).toBe(false);
  });

  it('returns true when domain is applied successfully', async () => {
    const runner = new FakeRunner();
    const runtimeRoot = join(TEST_ROOT, 'runtime', 'services');
    setupKibanCore(runtimeRoot);

    const provider = DockerComposeRuntimeProvider.withRunner(runner as unknown as Parameters<typeof DockerComposeRuntimeProvider.withRunner>[0], runtimeRoot);

    const result = await provider.applyInstanceDomain('kiban.example.com');

    expect(result).toBe(true);
  });
});
