import { describe, expect, it } from 'vitest';
import { validateComposeDocument } from './compose.validator';

const CONTEXT = { file: 'catalog/databases/postgresql/compose.yml' };

const minimalValid = {
  services: {
    postgresql: {
      image: 'postgres:17',
      restart: 'unless-stopped',
      command: 'postgres',
      environment: { POSTGRES_DB: '${KIBAN_POSTGRES_DB:-kiban}' },
      ports: ['${KIBAN_POSTGRESQL_PORT:-5432}:5432'],
      volumes: ['postgresql_data:/var/lib/postgresql/data'],
      depends_on: [],
      healthcheck: { test: ['CMD', 'pg_isready'], interval: '30s' },
      labels: { 'kiban.foo': 'bar' }
    }
  },
  volumes: { postgresql_data: {} }
};

describe('validateComposeDocument', () => {
  it('accepts a valid single-service compose document', () => {
    expect(validateComposeDocument(minimalValid, CONTEXT)).toEqual([]);
  });

  it('accepts a valid multi-service compose document', () => {
    const multi = {
      services: {
        supabase: { image: 'supabase/studio:latest' },
        'supabase-db': { image: 'supabase/postgres:15' }
      }
    };
    expect(validateComposeDocument(multi, CONTEXT)).toEqual([]);
  });

  it('rejects a non-object document', () => {
    const issues = validateComposeDocument('nope', CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: CONTEXT.file, service: '<root>', reason: expect.stringContaining('object') });
  });

  it('rejects a document without services', () => {
    const issues = validateComposeDocument({ volumes: {} }, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('services');
  });

  it('rejects empty services', () => {
    const issues = validateComposeDocument({ services: {} }, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('services');
  });

  it('rejects unsupported top-level keys with a descriptive error', () => {
    const doc = { services: { postgresql: { image: 'postgres:17' } }, networks: { net: {} } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: CONTEXT.file, service: '<root>', reason: expect.stringContaining('networks') });
    expect(issues[0]!.reason).toContain('unsupported');
  });

  it('rejects multiple unsupported top-level keys, one issue each', () => {
    const doc = { services: {}, configs: {}, secrets: {} };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects unsupported service-level keys with the service name in the issue', () => {
    const doc = { services: { postgresql: { image: 'postgres:17', build: '.' } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.service).toBe('services.postgresql');
    expect(issues[0]!.reason).toContain('build');
  });

  it('rejects a service without an image', () => {
    const issues = validateComposeDocument({ services: { app: { command: 'run' } } }, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.service).toBe('services.app');
    expect(issues[0]!.reason).toContain('image');
  });

  it('rejects a non-string image', () => {
    const issues = validateComposeDocument({ services: { app: { image: 42 } } }, CONTEXT);
    expect(issues[0]!.reason).toContain('image');
  });

  it('rejects port ranges in short form', () => {
    const doc = { services: { app: { image: 'x', ports: ['8000-8005:8000-8005'] } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('port');
  });

  it('rejects long-form ports with unsupported keys', () => {
    const doc = { services: { app: { image: 'x', ports: [{ target: 5432, published: '5432', mode: 'host' }] } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.reason).join(' | ')).toContain('mode');
  });

  it('accepts long-form ports with target and protocol', () => {
    const doc = { services: { app: { image: 'x', ports: [{ target: 5432, protocol: 'udp' }] } } };
    expect(validateComposeDocument(doc, CONTEXT)).toEqual([]);
  });

  it('rejects a malformed environment list entry', () => {
    const doc = { services: { app: { image: 'x', environment: ['NO_EQUALS_HERE'] } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('environment');
  });

  it('rejects bind mounts in long-form volumes', () => {
    const doc = { services: { app: { image: 'x', volumes: [{ type: 'bind', source: '/host', target: '/container' }] } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('bind');
  });

  it('accepts generated bind files that are materialized inside the runtime workspace', () => {
    const doc = {
      services: {
        app: {
          image: 'x',
          volumes: [{ type: 'bind', source: './config/app.yml', target: '/etc/app.yml', content: 'enabled: true\n' }]
        }
      }
    };

    expect(validateComposeDocument(doc, CONTEXT)).toEqual([]);
  });

  it('rejects a non-map labels block', () => {
    const doc = { services: { app: { image: 'x', labels: ['a=b'] } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('labels');
  });

  it('rejects a non-object healthcheck', () => {
    const doc = { services: { app: { image: 'x', healthcheck: 'curl' } } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('healthcheck');
  });

  it('aggregates multiple issues across services', () => {
    const doc = {
      services: {
        a: { image: 'x', build: '.' },
        b: { command: 'run' }
      }
    };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues.length).toBe(2);
  });

  it('rejects non-object service definitions', () => {
    const doc = { services: { app: 'postgres:17' } };
    const issues = validateComposeDocument(doc, CONTEXT);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('service');
  });
});
