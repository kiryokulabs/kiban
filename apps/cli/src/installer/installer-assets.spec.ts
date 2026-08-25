import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const installerPath = resolve(repositoryRoot, 'installer/install.sh');
const composeTemplatePath = resolve(repositoryRoot, 'installer/templates/compose.yaml');
const cliPath = resolve(repositoryRoot, 'apps/cli/kiban');

describe('Kiban installer assets', () => {
  it('provides an executable POSIX installer with required system checks', () => {
    const installer = readFileSync(installerPath, 'utf8');
    const mode = statSync(installerPath).mode;

    expect(installer.startsWith('#!/usr/bin/env sh')).toBe(true);
    expect(mode & 0o111).not.toBe(0);
    expect(installer).toContain('KIBAN_RELEASE_CHANNEL="${KIBAN_RELEASE_CHANNEL:-latest}"');
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
    expect(installer).toContain('resolve_kiban_version');
    expect(installer).toContain('start_kiban');
    expect(installer).toContain('docker compose');
    expect(installer).toContain('~/.kiban');
  });


  it('provides a CLI uninstall command', () => {
    const cli = readFileSync(cliPath, 'utf8');
    const mode = statSync(cliPath).mode;

    expect(cli.startsWith('#!/usr/bin/env sh')).toBe(true);
    expect(mode & 0o111).not.toBe(0);
    expect(cli).toContain('cmd_uninstall');
    expect(cli).toContain('uninstall) cmd_uninstall');
    expect(cli).toContain('--yes');
  });

  it('uninstalls Kiban without removing installed service runtime workspaces', () => {
    const testRoot = mkdtempSync(resolve(tmpdir(), 'kiban-cli-uninstall-'));
    const kibanHome = resolve(testRoot, '.kiban');
    const fakeBin = resolve(testRoot, 'bin');
    const dockerLog = resolve(testRoot, 'docker.log');

    mkdirSync(resolve(kibanHome, 'runtime/kiban'), { recursive: true });
    mkdirSync(resolve(kibanHome, 'runtime/traefik'), { recursive: true });
    mkdirSync(resolve(kibanHome, 'runtime/services/env-service'), { recursive: true });
    mkdirSync(resolve(kibanHome, 'bin'), { recursive: true });
    mkdirSync(fakeBin, { recursive: true });

    writeFileSync(resolve(kibanHome, 'runtime/kiban/compose.yaml'), 'services: {}\n', 'utf8');
    writeFileSync(resolve(kibanHome, 'runtime/kiban/.env'), 'KIBAN_HTTP_PORT=8080\n', 'utf8');
    writeFileSync(resolve(kibanHome, 'runtime/traefik/compose.yaml'), 'services: {}\n', 'utf8');
    writeFileSync(resolve(kibanHome, 'runtime/services/env-service/compose.yaml'), 'services: {}\n', 'utf8');
    writeFileSync(resolve(kibanHome, 'bin/kiban'), '#!/usr/bin/env sh\n', 'utf8');

    const fakeDocker = resolve(fakeBin, 'docker');
    writeFileSync(fakeDocker, `#!/usr/bin/env sh\nprintf '%s\\n' "$*" >> "${dockerLog}"\n`, 'utf8');
    chmodSync(fakeDocker, 0o755);

    try {
      execFileSync('sh', [cliPath, 'uninstall', '--yes'], {
        env: {
          ...process.env,
          KIBAN_HOME: kibanHome,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`
        },
        stdio: 'pipe'
      });

      expect(existsSync(resolve(kibanHome, 'runtime/kiban'))).toBe(false);
      expect(existsSync(resolve(kibanHome, 'runtime/traefik'))).toBe(false);
      expect(existsSync(resolve(kibanHome, 'bin/kiban'))).toBe(false);
      expect(existsSync(resolve(kibanHome, 'runtime/services/env-service/compose.yaml'))).toBe(true);
      expect(readFileSync(dockerLog, 'utf8')).toContain('--env-file');
      expect(readFileSync(dockerLog, 'utf8')).toContain('--project-name kiban-traefik');
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('does not include destructive service removal in the CLI uninstall command', () => {
    const cli = readFileSync(cliPath, 'utf8');

    expect(cli).toContain('KIBAN_SERVICES_DIR');
    expect(cli).toContain('Installed services were not removed');
    expect(cli).toContain('rm -rf -- "${KIBAN_RUNTIME_DIR}"');
    expect(cli).toContain('rm -rf -- "${KIBAN_TRAEFIK_DIR}"');
    expect(cli).not.toContain('rm -rf -- "${KIBAN_SERVICES_DIR}"');
    expect(cli).not.toContain('rm -rf -- "${KIBAN_HOME}"');
  });

  it('provides a Kiban core Compose template exposed on port 8080 by default', () => {
    const compose = readFileSync(composeTemplatePath, 'utf8');

    expect(compose).toContain('kiban-api:');
    expect(compose).toContain('kiban-web:');
    expect(compose).toContain('ghcr.io/kiryokulabs/kiban-api:${KIBAN_VERSION}');
    expect(compose).toContain('ghcr.io/kiryokulabs/kiban-web:${KIBAN_VERSION}');
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
    expect(workflow).toContain('ghcr.io/kiryokulabs/kiban-api');
    expect(workflow).toContain('ghcr.io/kiryokulabs/kiban-web');
    expect(workflow).toContain('docker/build-push-action');
    expect(workflow).toContain('github.event.release.tag_name');
    expect(workflow).toContain('dist/release/install.sh');
    expect(workflow).toContain('dist/release/VERSION');
    expect(workflow).toContain('dist/release/compose.yaml');
    expect(workflow).toContain('dist/release/kiban');
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
