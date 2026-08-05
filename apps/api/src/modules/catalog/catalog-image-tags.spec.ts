import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CATALOG_ROOT = join(__dirname, '..', '..', '..', '..', '..', 'catalog');

const readCompose = (category: string, service: string): string => readFileSync(join(CATALOG_ROOT, category, service, 'compose.yaml'), 'utf8');

describe('Catalog image tag regressions', () => {
  it('does not use the non-existent ClickHouse :25 tag', () => {
    expect(readCompose('databases', 'clickhouse')).not.toContain('clickhouse/clickhouse-server:25\n');
    expect(readCompose('analytics', 'plausible')).not.toContain('clickhouse/clickhouse-server:25\n');
  });

  it('does not use the non-existent Grafana Tempo :2 tag', () => {
    expect(readCompose('monitoring', 'tempo')).not.toContain('grafana/tempo:2\n');
  });
});
