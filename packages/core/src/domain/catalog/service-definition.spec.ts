import { describe, expect, it } from 'vitest';
import { expectTypeOf } from 'vitest';
import type { AccessPoint, AccessPointConnection, ServiceDefinition, ServiceMetadata } from './service-definition.js';
import type { RuntimeSpec } from './runtime-spec.js';

/** Minimal valid metadata document (every required whitelist key). */
const validMetadata = (): ServiceMetadata => ({
  id: 'postgresql',
  name: 'PostgreSQL',
  description: 'Official PostgreSQL relational database.',
  category: 'databases',
  author: 'Kiban',
  minimumVersion: '0.1.0',
  accessPoints: []
});

/** Metadata document exercising every optional whitelist key. */
const fullMetadata = (): ServiceMetadata => ({
  ...validMetadata(),
  icon: 'icon.svg',
  tags: ['database', 'sql'],
  documentation: 'https://www.postgresql.org/docs/',
  website: 'https://www.postgresql.org/',
  license: 'PostgreSQL License',
  featured: true
});

/** Database access point whose connection block references env var names. */
const databaseAccessPoint = (): AccessPoint => ({
  name: 'Database',
  kind: 'postgres',
  service: 'db',
  port: 5432,
  connection: { username: 'POSTGRES_USER', password: 'POSTGRES_PASSWORD', database: 'POSTGRES_DB' }
});

const validDefinition = (): ServiceDefinition => ({
  id: 'postgresql',
  metadata: validMetadata(),
  composeYaml: 'services:\n  db:\n    image: postgres:17\n',
  runtime: { services: [] },
  schema: {},
  icon: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  sourcePath: '/catalog/databases/postgresql'
});

describe('ServiceMetadata — metadata.json whitelist', () => {
  it('accepts a minimal valid document', () => {
    expect(validMetadata()).toBeDefined();
    expectTypeOf<ServiceMetadata>().toMatchTypeOf<{
      id: string;
      name: string;
      description: string;
      category: string;
      author: string;
      minimumVersion: string;
      accessPoints: readonly AccessPoint[];
    }>();
  });

  it('accepts every optional whitelist key', () => {
    expect(fullMetadata()).toBeDefined();
    expectTypeOf(fullMetadata()).toMatchTypeOf<ServiceMetadata>();
  });

  it('rejects deployment keys (docker, ports, volumes, environment, healthcheck)', () => {
    // @ts-expect-error `docker` is not part of the metadata whitelist
    const withDocker: ServiceMetadata = { ...validMetadata(), docker: { image: 'postgres' } };
    // @ts-expect-error `ports` is not part of the metadata whitelist
    const withPorts: ServiceMetadata = { ...validMetadata(), ports: [{ name: 'default', port: 5432 }] };
    // @ts-expect-error `volumes` is not part of the metadata whitelist
    const withVolumes: ServiceMetadata = { ...validMetadata(), volumes: [{ name: 'data', mountPath: '/data' }] };
    // @ts-expect-error `environment` is not part of the metadata whitelist
    const withEnvironment: ServiceMetadata = { ...validMetadata(), environment: [{ key: 'POSTGRES_DB' }] };
    // @ts-expect-error `healthcheck` is not part of the metadata whitelist
    const withHealthcheck: ServiceMetadata = { ...validMetadata(), healthcheck: { type: 'tcp', target: 'localhost' } };
    expect(withDocker).toBeDefined();
    expect(withPorts).toBeDefined();
    expect(withVolumes).toBeDefined();
    expect(withEnvironment).toBeDefined();
    expect(withHealthcheck).toBeDefined();
  });

  it('rejects keys dropped from the old format (version, protocol, credentials)', () => {
    // @ts-expect-error `version` is no longer part of the metadata whitelist
    const withVersion: ServiceMetadata = { ...validMetadata(), version: '1.0.0' };
    // @ts-expect-error `protocol` was replaced by `kind`
    const withProtocol: ServiceMetadata = { ...validMetadata(), protocol: 'http' };
    // @ts-expect-error `credentials` was renamed to `connection` on access points
    const withCredentials: ServiceMetadata = { ...validMetadata(), credentials: { username: 'USER' } };
    expect(withVersion).toBeDefined();
    expect(withProtocol).toBeDefined();
    expect(withCredentials).toBeDefined();
  });

  it('requires every mandatory key', () => {
    // @ts-expect-error `id` is required
    const noId: ServiceMetadata = { name: 'X', description: 'd', category: 'c', author: 'a', minimumVersion: '0.1.0', accessPoints: [] };
    // @ts-expect-error `name` is required
    const noName: ServiceMetadata = { id: 'x', description: 'd', category: 'c', author: 'a', minimumVersion: '0.1.0', accessPoints: [] };
    // @ts-expect-error `description` is required
    const noDescription: ServiceMetadata = { id: 'x', name: 'X', category: 'c', author: 'a', minimumVersion: '0.1.0', accessPoints: [] };
    // @ts-expect-error `category` is required
    const noCategory: ServiceMetadata = { id: 'x', name: 'X', description: 'd', author: 'a', minimumVersion: '0.1.0', accessPoints: [] };
    // @ts-expect-error `author` is required
    const noAuthor: ServiceMetadata = { id: 'x', name: 'X', description: 'd', category: 'c', minimumVersion: '0.1.0', accessPoints: [] };
    // @ts-expect-error `minimumVersion` is required
    const noMinimumVersion: ServiceMetadata = { id: 'x', name: 'X', description: 'd', category: 'c', author: 'a', accessPoints: [] };
    // @ts-expect-error `accessPoints` is required
    const noAccessPoints: ServiceMetadata = { id: 'x', name: 'X', description: 'd', category: 'c', author: 'a', minimumVersion: '0.1.0' };
    expect(noId).toBeDefined();
    expect(noName).toBeDefined();
    expect(noDescription).toBeDefined();
    expect(noCategory).toBeDefined();
    expect(noAuthor).toBeDefined();
    expect(noMinimumVersion).toBeDefined();
    expect(noAccessPoints).toBeDefined();
  });
});

describe('AccessPoint — network access points', () => {
  it('kind is an open string (web, postgres, mysql, redis, ...)', () => {
    expectTypeOf<AccessPoint['kind']>().toEqualTypeOf<string>();
  });

  it('service references a compose service name', () => {
    expectTypeOf<AccessPoint['service']>().toEqualTypeOf<string>();
    expectTypeOf<AccessPoint['port']>().toEqualTypeOf<number>();
  });

  it('accepts a web access point without a connection block', () => {
    const web: AccessPoint = { name: 'Web UI', kind: 'web', service: 'server', port: 9000 };
    expect(web).toBeDefined();
    expectTypeOf(web).toMatchTypeOf<AccessPoint>();
  });

  it('accepts a database access point with a connection block', () => {
    expect(databaseAccessPoint()).toBeDefined();
    expectTypeOf(databaseAccessPoint()).toMatchTypeOf<AccessPoint>();
  });

  it('connection references are environment variable names — never values', () => {
    expectTypeOf<AccessPointConnection>().toMatchTypeOf<{ username?: string; password?: string; database?: string }>();
    // @ts-expect-error a connection reference must be a string (env var name)
    const numericPassword: AccessPoint = { name: 'DB', kind: 'postgres', service: 'db', port: 5432, connection: { password: 12345 } };
    // @ts-expect-error the old `credentials` name is gone
    const legacyCredentials: AccessPoint = { name: 'DB', kind: 'postgres', service: 'db', port: 5432, credentials: { username: 'USER' } };
    expect(numericPassword).toBeDefined();
    expect(legacyCredentials).toBeDefined();
  });

  it('is immutable', () => {
    const accessPoint = databaseAccessPoint();
    const originalName = accessPoint.name;
    // @ts-expect-error access points are immutable
    accessPoint.name = 'Other';
    // @ts-expect-error connection is optional and immutable
    accessPoint.connection = { username: 'OTHER' };
    expect(originalName).toBe('Database');
  });
});

describe('ServiceDefinition — the frozen merged view', () => {
  it('carries the merged content of the four catalog files', () => {
    expect(validDefinition()).toBeDefined();
    expectTypeOf<ServiceDefinition>().toMatchTypeOf<{
      id: string;
      metadata: ServiceMetadata;
      composeYaml: string;
      runtime: RuntimeSpec;
      schema: Readonly<Record<string, unknown>>;
      icon: string;
      sourcePath: string;
    }>();
  });

  it('requires a runtime spec (derived from compose.yml)', () => {
    // @ts-expect-error `runtime` is required
    const noRuntime: ServiceDefinition = { id: 'x', metadata: validMetadata(), composeYaml: '', schema: {}, icon: '', sourcePath: '' };
    // @ts-expect-error `composeYaml` is required
    const noCompose: ServiceDefinition = { id: 'x', metadata: validMetadata(), runtime: { services: [] }, schema: {}, icon: '', sourcePath: '' };
    expect(noRuntime).toBeDefined();
    expect(noCompose).toBeDefined();
  });

  it('is immutable', () => {
    const definition = validDefinition();
    // @ts-expect-error service definitions are immutable
    definition.metadata.name = 'Other';
    // @ts-expect-error the accessPoints array is readonly
    definition.metadata.accessPoints.push(databaseAccessPoint());
    expect(definition.id).toBe('postgresql');
  });
});
