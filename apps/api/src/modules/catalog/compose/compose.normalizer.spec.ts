import { describe, expect, it } from 'vitest';
import { normalizeComposeDocument } from './compose.normalizer';
import type { CatalogValidationIssue, RuntimeService, RuntimeSpec } from '@kiban/core';

const CONTEXT = { file: 'catalog/databases/postgresql/compose.yml' };

/** Returns the first normalized service, asserting the spec was produced. */
const firstService = (spec: RuntimeSpec | undefined): RuntimeService => spec!.services[0]!;

const only = (issues: readonly CatalogValidationIssue[]): void => {
  expect(issues).toEqual([]);
};

describe('normalizeComposeDocument', () => {
  it('splits image into image and tag', () => {
    const { spec, issues } = normalizeComposeDocument({ services: { app: { image: 'postgres:17' } } }, CONTEXT);
    only(issues);
    expect(firstService(spec)).toMatchObject({ name: 'app', image: 'postgres', tag: '17' });
  });

  it('defaults the tag to latest when absent', () => {
    const { spec } = normalizeComposeDocument({ services: { app: { image: 'redis' } } }, CONTEXT);
    expect(firstService(spec)).toMatchObject({ image: 'redis', tag: 'latest' });
  });

  it('defaults restart to no when absent', () => {
    const { spec } = normalizeComposeDocument({ services: { app: { image: 'redis' } } }, CONTEXT);
    expect(firstService(spec).restart).toBe('no');
  });

  it('normalizes short-form ports to container ports, ignoring the host side', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', ports: ['5432', '5432/udp', '${KIBAN_PORT:-5432}:5432', '127.0.0.1:8080:80'] } } },
      CONTEXT
    );
    expect(firstService(spec).ports).toEqual([
      { port: 5432, protocol: 'tcp' },
      { port: 5432, protocol: 'udp' },
      { port: 5432, protocol: 'tcp' },
      { port: 80, protocol: 'tcp' }
    ]);
  });

  it('normalizes long-form ports', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', ports: [{ target: 5432, protocol: 'udp' }] } } },
      CONTEXT
    );
    expect(firstService(spec).ports).toEqual([{ port: 5432, protocol: 'udp' }]);
  });

  it('resolves map-form environment entries with defaults', () => {
    const { spec } = normalizeComposeDocument(
      {
        services: {
          app: {
            image: 'x',
            environment: { WITH_DEFAULT: '${KIBAN_A:-kiban}', REQUIRED: '${KIBAN_B}', PLAIN: 'value' }
          }
        }
      },
      CONTEXT
    );
    expect(firstService(spec).environment).toEqual([
      { key: 'WITH_DEFAULT', value: 'kiban', required: false, sourceVariableName: 'KIBAN_A' },
      { key: 'REQUIRED', required: true, sourceVariableName: 'KIBAN_B' },
      { key: 'PLAIN', value: 'value', required: false }
    ]);
  });

  it('resolves list-form environment entries', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', environment: ['A=${KIBAN_A:-x}', 'B=${KIBAN_B}'] } } },
      CONTEXT
    );
    expect(firstService(spec).environment).toEqual([
      { key: 'A', value: 'x', required: false, sourceVariableName: 'KIBAN_A' },
      { key: 'B', required: true, sourceVariableName: 'KIBAN_B' }
    ]);
  });

  it('records interpolation variables used inside composed environment values', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', environment: { DATABASE_URL: 'postgres://${SERVICE_USER_POSTGRES}:${SERVICE_PASSWORD_POSTGRES}@postgres:5432/app' } } } },
      CONTEXT
    );

    expect(firstService(spec).environment).toEqual([
      {
        key: 'DATABASE_URL',
        value: 'postgres://${SERVICE_USER_POSTGRES}:${SERVICE_PASSWORD_POSTGRES}@postgres:5432/app',
        required: false,
        sourceVariableNames: ['SERVICE_USER_POSTGRES', 'SERVICE_PASSWORD_POSTGRES']
      }
    ]);
  });

  it('keeps the last value for duplicate environment keys in list form', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', environment: ['A=first', 'A=second'] } } },
      CONTEXT
    );
    expect(firstService(spec).environment).toEqual([{ key: 'A', value: 'second', required: false }]);
  });

  it('normalizes short-form volumes into named mounts and anonymous targets', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', volumes: ['data:/var/lib/data', '/tmp/cache'] } }, volumes: { data: {} } },
      CONTEXT
    );
    expect(firstService(spec).volumes).toEqual([
      { name: 'data', target: '/var/lib/data' },
      { target: '/tmp/cache' }
    ]);
  });

  it('normalizes long-form volume mounts', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', volumes: [{ type: 'volume', source: 'data', target: '/var/lib/data' }] } }, volumes: { data: {} } },
      CONTEXT
    );
    expect(firstService(spec).volumes).toEqual([{ name: 'data', target: '/var/lib/data' }]);
  });

  it('ignores generated bind files when reporting persistent runtime volumes', () => {
    const { spec, issues } = normalizeComposeDocument(
      { services: { app: { image: 'x', volumes: [{ type: 'bind', source: './config/app.yml', target: '/etc/app.yml', content: 'enabled: true\n' }] } } },
      CONTEXT
    );
    expect(issues).toEqual([]);
    expect(firstService(spec).volumes).toEqual([]);
  });

  it('reports an issue when a named volume is not declared at the top level', () => {
    const { spec, issues } = normalizeComposeDocument(
      { services: { app: { image: 'x', volumes: ['mystery:/data'] } } },
      CONTEXT
    );
    expect(spec).toBeUndefined();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: CONTEXT.file, service: 'services.app', reason: expect.stringContaining('mystery') });
  });

  it('converts string commands to shell form and preserves templates', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', command: '--api-key=${KIBAN_API_KEY:-kiban}' } } },
      CONTEXT
    );
    expect(firstService(spec).command).toEqual(['/bin/sh', '-c', '--api-key=${KIBAN_API_KEY:-kiban}']);
  });

  it('keeps list-form commands as-is', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', command: ['npm', 'start'] } } },
      CONTEXT
    );
    expect(firstService(spec).command).toEqual(['npm', 'start']);
  });

  it('converts string entrypoints to shell form', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', entrypoint: 'entry.sh' } } },
      CONTEXT
    );
    expect(firstService(spec).entrypoint).toEqual(['/bin/sh', '-c', 'entry.sh']);
  });

  it('normalizes depends_on from list form', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', depends_on: ['db', 'redis'] }, db: { image: 'y' }, redis: { image: 'z' } } },
      CONTEXT
    );
    expect(firstService(spec).dependsOn).toEqual(['db', 'redis']);
  });

  it('normalizes depends_on from map form', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', depends_on: { db: { condition: 'service_healthy' } } }, db: { image: 'y' } } },
      CONTEXT
    );
    expect(firstService(spec).dependsOn).toEqual(['db']);
  });

  it('reports an issue when depends_on references an unknown service', () => {
    const { issues } = normalizeComposeDocument(
      { services: { app: { image: 'x', depends_on: ['ghost'] } } },
      CONTEXT
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('ghost');
  });

  it('normalizes healthcheck with durations to seconds', () => {
    const { spec } = normalizeComposeDocument(
      {
        services: {
          app: {
            image: 'x',
            healthcheck: { test: ['CMD', 'pg_isready'], interval: '30s', timeout: '5s', retries: 3, start_period: '1m' }
          }
        }
      },
      CONTEXT
    );
    expect(firstService(spec).healthcheck).toEqual({
      test: ['CMD', 'pg_isready'],
      intervalSeconds: 30,
      timeoutSeconds: 5,
      retries: 3,
      startPeriodSeconds: 60
    });
  });

  it('normalizes string healthcheck tests to shell form', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', healthcheck: { test: 'CMD-SHELL curl -f http://localhost' } } } },
      CONTEXT
    );
    expect(firstService(spec).healthcheck!.test).toEqual(['CMD-SHELL', 'curl -f http://localhost']);
  });

  it('reports an issue for an invalid duration', () => {
    const { issues } = normalizeComposeDocument(
      { services: { app: { image: 'x', healthcheck: { test: ['CMD', 'x'], interval: 'soon' } } } },
      CONTEXT
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('interval');
  });

  it('normalizes labels to a string record', () => {
    const { spec } = normalizeComposeDocument(
      { services: { app: { image: 'x', labels: { 'kiban.foo': 'bar', count: 3 } } } },
      CONTEXT
    );
    expect(firstService(spec).labels).toEqual({ 'kiban.foo': 'bar', count: '3' });
  });

  it('normalizes multiple services', () => {
    const { spec } = normalizeComposeDocument(
      { services: { api: { image: 'app:1', depends_on: ['db'] }, db: { image: 'postgres:17' } } },
      CONTEXT
    );
    expect(spec!.services.map((s) => s.name)).toEqual(['api', 'db']);
    expect(spec!.services[1]!.dependsOn).toEqual([]);
  });

  it('returns undefined spec and an issue for a missing image', () => {
    const { spec, issues } = normalizeComposeDocument({ services: { app: { command: 'run' } } }, CONTEXT);
    expect(spec).toBeUndefined();
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('image');
  });
});
