import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const installerPath = resolve(repositoryRoot, 'installer/install.sh');
const composeTemplatePath = resolve(repositoryRoot, 'installer/templates/compose.yaml');

describe('Kiban installer assets', () => {
  it('provides an executable POSIX installer with required system checks', () => {
    const installer = readFileSync(installerPath, 'utf8');
    const mode = statSync(installerPath).mode;

    expect(installer.startsWith('#!/usr/bin/env sh')).toBe(true);
    expect(mode & 0o111).not.toBe(0);
    expect(installer).toContain('KIBAN_VERSION="${KIBAN_VERSION:-0.1.0}"');
    expect(installer).toContain('KIBAN_HTTP_PORT="${KIBAN_HTTP_PORT:-8080}"');
    expect(installer).toContain('check_supported_os');
    expect(installer).toContain('Darwin');
    expect(installer).toContain('install Docker Desktop');
    expect(installer).toContain('check_supported_architecture');
    expect(installer).toContain('ensure_docker');
    expect(installer).toContain('ensure_docker_compose');
    expect(installer).toContain('ensure_port_available');
    expect(installer).toContain('write_runtime_environment');
    expect(installer).toContain('download_core_compose');
    expect(installer).toContain('start_kiban');
    expect(installer).toContain('docker compose');
    expect(installer).toContain('~/.kiban');
  });

  it('provides a Kiban core Compose template exposed on port 8080 by default', () => {
    const compose = readFileSync(composeTemplatePath, 'utf8');

    expect(compose).toContain('kiban-api:');
    expect(compose).toContain('kiban-web:');
    expect(compose).toContain('ghcr.io/kibanos/kiban-api:${KIBAN_VERSION:-0.1.0}');
    expect(compose).toContain('ghcr.io/kibanos/kiban-web:${KIBAN_VERSION:-0.1.0}');
    expect(compose).toContain('${KIBAN_HTTP_PORT:-8080}:80');
    expect(compose).toContain('${KIBAN_HOME}:${KIBAN_HOME}');
    expect(compose).toContain('/var/run/docker.sock:/var/run/docker.sock:ro');
    expect(compose).toContain('HOME: ${KIBAN_USER_HOME}');
    expect(compose).toContain('restart: unless-stopped');
  });
  it('provides Docker image definitions and GHCR release workflow', () => {
    const apiDockerfile = readFileSync(resolve(repositoryRoot, 'apps/api/Dockerfile'), 'utf8');
    const webDockerfile = readFileSync(resolve(repositoryRoot, 'apps/web/Dockerfile'), 'utf8');
    const nginxConfig = readFileSync(resolve(repositoryRoot, 'apps/web/nginx.conf'), 'utf8');
    const workflow = readFileSync(resolve(repositoryRoot, '.github/workflows/release-images.yml'), 'utf8');

    expect(apiDockerfile).toContain('FROM node:22-bookworm-slim');
    expect(apiDockerfile).toContain('pnpm --filter @kiban/api build');
    expect(apiDockerfile).toContain('pnpm install --frozen-lockfile --prod');
    expect(apiDockerfile).toContain('CMD ["node", "apps/api/dist/main.js"]');
    expect(webDockerfile).toContain('FROM nginx:1.27-alpine');
    expect(webDockerfile).toContain('pnpm --filter @kiban/web build');
    expect(nginxConfig).toContain('location /api/');
    expect(nginxConfig).toContain('location /socket.io/');
    expect(nginxConfig).toContain('proxy_pass http://kiban-api:3000');
    expect(nginxConfig).not.toContain('location /projects');
    expect(workflow).toContain('ghcr.io/kibanos/kiban-api');
    expect(workflow).toContain('ghcr.io/kibanos/kiban-web');
    expect(workflow).toContain('docker/build-push-action');
    expect(workflow).toContain('github.event.release.tag_name');
  });

  it('keeps local Angular development on the same /api and Socket.IO contract', () => {
    const angularConfig = readFileSync(resolve(repositoryRoot, 'apps/web/angular.json'), 'utf8');
    const proxyConfig = readFileSync(resolve(repositoryRoot, 'apps/web/proxy.conf.json'), 'utf8');

    expect(angularConfig).toContain('"proxyConfig": "proxy.conf.json"');
    expect(proxyConfig).toContain('"/api"');
    expect(proxyConfig).toContain('"/socket.io"');
    expect(proxyConfig).toContain('"target": "http://localhost:3100"');
    expect(proxyConfig).toContain('"ws": true');
  });

});
