import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ServiceDefinition } from '@kiban/core';
import { CatalogValidationError } from '@kiban/core';
import { CatalogLoader } from './catalog.loader';

interface ServiceFixtureOptions {
  readonly name?: string;
  readonly accessPoints?: Readonly<Record<string, unknown>>[];
  readonly env?: Readonly<Record<string, string>>;
  readonly ports?: readonly string[];
  readonly composeExtra?: string;
}

/** Writes a valid NEW-format service (whitelist metadata, subset compose, schema matching env). */
const writeService = (root: string, category: string, service: string, options: ServiceFixtureOptions = {}): string => {
  const dir = join(root, category, service);
  mkdirSync(dir, { recursive: true });
  const env = options.env ?? { POSTGRES_DB: 'kiban', POSTGRES_USER: 'kiban' };
  const ports = options.ports ?? ['5432'];
  const environment = Object.entries(env)
    .map(([key, value]) => `      ${key}: ${value}`)
    .join('\n');
  const portLines = ports.map((port) => `      - "${port}"`).join('\n');
  const accessPoints = options.accessPoints ?? [{ name: 'Database', kind: 'postgres', service, port: 5432 }];
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    id: service,
    name: options.name ?? service,
    description: `${service} service`,
    category,
    author: 'Kiban',
    minimumVersion: '0.1.0',
    accessPoints
  }));
  writeFileSync(join(dir, 'compose.yaml'), [
    'services:',
    `  ${service}:`,
    `    image: ${service}:latest`,
    `    environment:`,
    environment,
    `    ports:`,
    portLines,
    options.composeExtra ?? ''
  ].filter((line) => line !== '').join('\n'));
  const schemaProperties = Object.fromEntries(Object.keys(env).map((key) => [key, { type: 'string' }]));
  writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: schemaProperties }));
  writeFileSync(join(dir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>');
  return dir;
};

const writeMetadataOnly = (root: string, category: string, service: string): string => {
  const dir = join(root, category, service);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ id: service, name: service, description: `${service} service`, category, author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [] }));
  return dir;
};

const load = (root: string): Promise<readonly ServiceDefinition[]> => CatalogLoader.fromRoot(root).load();

/** Loads the first definition, failing the test when the catalog is invalid or empty. */
const loadFirst = async (root: string): Promise<ServiceDefinition> => {
  const definitions = await load(root);
  const first = definitions[0];
  if (first === undefined) {
    throw new Error('expected at least one service definition');
  }
  return first;
};

const collectIssues = (error: unknown): readonly { readonly file: string; readonly service: string; readonly reason: string }[] => {
  if (!(error instanceof CatalogValidationError)) throw new Error(`expected CatalogValidationError, got ${String(error)}`);
  return error.issues;
};

describe('CatalogLoader — happy path', () => {
  it('loads a valid service into a complete ServiceDefinition', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql', { name: 'PostgreSQL' });

    const definition = await loadFirst(root);

    expect(definition.id).toBe('postgresql');
    expect(definition.metadata).toMatchObject({
      id: 'postgresql',
      name: 'PostgreSQL',
      category: 'databases',
      author: 'Kiban',
      minimumVersion: '0.1.0'
    });
    expect(definition.composeYaml).toContain('image: postgresql:latest');
    expect(definition.runtime.services).toHaveLength(1);
    expect(definition.runtime.services[0]).toMatchObject({ name: 'postgresql', image: 'postgresql', tag: 'latest' });
    expect(definition.runtime.services[0]!.ports).toEqual([{ port: 5432, protocol: 'tcp' }]);
    expect(definition.schema).toBeDefined();
    expect(definition.icon).toContain('<svg');
    expect(definition.sourcePath).toBe(dir);
  });

  it('sorts services by category then name', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'messaging', 'nats', { name: 'NATS' });
    writeService(root, 'databases', 'postgresql', { name: 'PostgreSQL' });

    const definitions = await load(root);

    expect(definitions.map((item) => item.id)).toEqual(['postgresql', 'nats']);
  });

  it('normalizes a multi-service compose file into multiple runtime services', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = join(root, 'analytics', 'app');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
      id: 'app',
      name: 'App',
      description: 'App service',
      category: 'analytics',
      author: 'Kiban',
      minimumVersion: '0.1.0',
      accessPoints: [
        { name: 'Web UI', kind: 'web', service: 'server', port: 8000 },
        { name: 'Database', kind: 'postgres', service: 'db', port: 5432, connection: { username: 'POSTGRES_USER', password: 'POSTGRES_PASSWORD', database: 'POSTGRES_DB' } }
      ]
    }));
    writeFileSync(join(dir, 'compose.yaml'), [
      'services:',
      '  server:',
      '    image: app:latest',
      '    ports:',
      '      - "8000"',
      '    environment:',
      '      DATABASE_URL: postgres://db/app',
      '  db:',
      '    image: postgres:17',
      '    ports:',
      '      - "5432"',
      '    environment:',
      '      POSTGRES_DB: app',
      '      POSTGRES_USER: app',
      '      POSTGRES_PASSWORD: secret'
    ].join('\n'));
    writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: { DATABASE_URL: { type: 'string' } } }));
    writeFileSync(join(dir, 'icon.svg'), '<svg></svg>');

    const definition = await loadFirst(root);

    expect(definition.runtime.services.map((service) => service.name)).toEqual(['server', 'db']);
    expect(definition.metadata.accessPoints).toHaveLength(2);
    expect(definition.metadata.accessPoints[1]!.connection).toEqual({
      username: 'POSTGRES_USER',
      password: 'POSTGRES_PASSWORD',
      database: 'POSTGRES_DB'
    });
  });

  it('returns an empty list when the root does not exist', async () => {
    await expect(load(join(tmpdir(), 'kiban-loader-missing', crypto.randomUUID()))).resolves.toEqual([]);
  });
});

describe('CatalogLoader — required files', () => {
  it('fails when required files are missing, reporting each one', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeMetadataOnly(root, 'databases', 'broken');

    const error = await load(root).catch((caught: unknown) => caught);
    const issues = collectIssues(error);

    expect(issues).toHaveLength(3);
    for (const file of ['compose.yaml', 'schema.json', 'icon.svg']) {
      expect(issues.some((issue) => issue.reason === `missing required file "${file}"`)).toBe(true);
    }
    expect(issues.every((issue) => issue.service === 'broken')).toBe(true);
  });

  it('fails when metadata.json is missing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = join(root, 'databases', 'ghost');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'compose.yaml'), 'services:\n  ghost:\n    image: ghost:latest\n');

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason === 'missing required file "metadata.json"')).toBe(true);
  });
});

describe('CatalogLoader — metadata whitelist', () => {
  it('rejects unknown metadata keys', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    const metadata = JSON.parse(readMetadata(dir)) as Readonly<Record<string, unknown>>;
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ ...metadata, docker: { image: 'postgres' } }));

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('unknown metadata key "docker"'))).toBe(true);
  });

  it('rejects metadata whose id does not match the folder name', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    const metadata = JSON.parse(readMetadata(dir)) as Readonly<Record<string, unknown>>;
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ ...metadata, id: 'postgres' }));

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('does not match folder name'))).toBe(true);
  });

  it('rejects metadata whose category does not match the parent folder', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    const metadata = JSON.parse(readMetadata(dir)) as Readonly<Record<string, unknown>>;
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ ...metadata, category: 'storage' }));

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('does not match folder category'))).toBe(true);
  });

  it('rejects metadata missing a required key', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    const metadata = JSON.parse(readMetadata(dir)) as Readonly<Record<string, unknown>>;
    const { description: _description, ...withoutDescription } = metadata;
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify(withoutDescription));

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason === 'metadata "description" must be a non-empty string')).toBe(true);
  });

  it('rejects metadata.json that is not valid JSON', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    writeFileSync(join(dir, 'metadata.json'), '{oops');

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason === 'metadata.json must be valid JSON')).toBe(true);
  });
});

describe('CatalogLoader — access points', () => {
  it('rejects an access point referencing an unknown compose service', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', { accessPoints: [{ name: 'Database', kind: 'postgres', service: 'nope', port: 5432 }] });

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('references unknown compose service "nope"'))).toBe(true);
  });

  it('rejects an access point whose port is not exposed by the compose service', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', { accessPoints: [{ name: 'Database', kind: 'postgres', service: 'postgresql', port: 9999 }] });

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('references port 9999') && issue.reason.includes('does not expose'))).toBe(true);
  });

  it('rejects duplicated access point names within a service', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', {
      accessPoints: [
        { name: 'Database', kind: 'postgres', service: 'postgresql', port: 5432 },
        { name: 'Database', kind: 'postgres', service: 'postgresql', port: 5432 }
      ]
    });

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('duplicate access point name "Database"'))).toBe(true);
  });

  it('rejects an access point with a numeric connection reference', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', {
      accessPoints: [{ name: 'Database', kind: 'postgres', service: 'postgresql', port: 5432, connection: { password: 12345 } }]
    });

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('connection "password" must be a string'))).toBe(true);
  });
});

describe('CatalogLoader — schema and cross-file rules', () => {
  it('accepts schema fields backed by compose interpolation variables', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    writeFileSync(join(dir, 'compose.yaml'), [
      'services:',
      '  postgresql:',
      '    image: postgres:17',
      '    ports:',
      '      - "5432"',
      '    environment:',
      '      POSTGRES_PASSWORD: ${SERVICE_PASSWORD_POSTGRES:-kiban}'
    ].join('\n'));
    writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: { SERVICE_PASSWORD_POSTGRES: { type: 'string' } } }));

    await expect(load(root)).resolves.toHaveLength(1);
  });

  it('accepts schema fields backed by interpolation variables inside composed environment values', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    writeFileSync(join(dir, 'compose.yaml'), [
      'services:',
      '  postgresql:',
      '    image: postgres:17',
      '    ports:',
      '      - "5432"',
      '    environment:',
      '      DATABASE_URL: postgres://${SERVICE_USER_POSTGRES}:${SERVICE_PASSWORD_POSTGRES}@postgresql:5432/app'
    ].join('\n'));
    writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: { SERVICE_PASSWORD_POSTGRES: { type: 'string' } } }));

    await expect(load(root)).resolves.toHaveLength(1);
  });

  it('rejects schema fields not declared in the compose environment', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: { NOT_A_COMPOSE_VAR: { type: 'string' } } }));

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('schema field "NOT_A_COMPOSE_VAR" is not declared in the compose environment'))).toBe(true);
  });

  it('rejects duplicated service ids across the catalog', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql');
    writeService(root, 'storage', 'postgresql');

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('duplicate service id "postgresql"'))).toBe(true);
  });
});

describe('CatalogLoader — compose pipeline integration', () => {
  it('rejects compose documents using unsupported keys', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', { composeExtra: '    build: .' });

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('unsupported compose feature'))).toBe(true);
  });

  it('rejects invalid YAML in compose.yaml', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    const dir = writeService(root, 'databases', 'postgresql');
    writeFileSync(join(dir, 'compose.yaml'), 'services: [unclosed');

    const issues = collectIssues(await load(root).catch((caught: unknown) => caught));

    expect(issues.some((issue) => issue.reason.includes('invalid YAML'))).toBe(true);
  });
});

describe('CatalogLoader — aggregation and freeze', () => {
  it('aggregates every issue across every service into a single error', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', { accessPoints: [{ name: 'Database', kind: 'postgres', service: 'missing', port: 5432 }] });
    writeService(root, 'messaging', 'nats', { accessPoints: [{ name: 'Queue', kind: 'nats', service: 'nats', port: 1 }] });

    const error = await load(root).catch((caught: unknown) => caught);
    const issues = collectIssues(error);

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.reason.includes('references'))).toBe(true);
    expect(new Set(issues.map((issue) => issue.service))).toEqual(new Set(['postgresql', 'nats']));
  });

  it('deeply freezes every loaded definition', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-loader-'));
    writeService(root, 'databases', 'postgresql', { accessPoints: [{ name: 'Database', kind: 'postgres', service: 'postgresql', port: 5432 }] });

    const definition = await loadFirst(root);

    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.metadata)).toBe(true);
    expect(Object.isFrozen(definition.metadata.accessPoints)).toBe(true);
    expect(Object.isFrozen(definition.metadata.accessPoints[0])).toBe(true);
    expect(Object.isFrozen(definition.runtime)).toBe(true);
    expect(Object.isFrozen(definition.runtime.services)).toBe(true);
    expect(Object.isFrozen(definition.runtime.services[0])).toBe(true);
    expect(Object.isFrozen(definition.schema)).toBe(true);
  });
});

const readMetadata = (dir: string): string => readFileSync(join(dir, 'metadata.json'), 'utf8');
