import { describe, expect, it, vi } from 'vitest';
import { SqliteMonitoringRepository } from './sqlite-monitoring.repository';
import type { MonitoringSampleInput } from '../application/monitoring.models';

interface CapturedStatement { readonly sql: string; readonly params: readonly unknown[]; }

interface CapturingDatabase {
  readonly statements: CapturedStatement[];
  nextRows: Record<string, string | number | null>[];
  run(sql: string, params?: readonly unknown[]): Promise<void>;
  all<T>(sql: string, params?: readonly unknown[]): Promise<readonly T[]>;
}

const createDatabase = (): CapturingDatabase => ({
  statements: [],
  nextRows: [],
  run: vi.fn(async function run(this: CapturingDatabase, sql: string, params: readonly unknown[] = []): Promise<void> { this.statements.push({ sql, params }); }),
  async all<T>(this: CapturingDatabase, sql: string, params: readonly unknown[] = []): Promise<readonly T[]> {
    this.statements.push({ sql, params });
    return this.nextRows as unknown as readonly T[];
  }
});

const sample = (overrides: Partial<MonitoringSampleInput> = {}): MonitoringSampleInput => ({
  scope: 'host',
  resourceId: 'host',
  capturedAt: new Date('2026-09-10T10:00:00.000Z'),
  cpuPercent: 12.5,
  memoryUsedBytes: 8_000,
  memoryLimitBytes: 16_000,
  diskUsedBytes: 40_000,
  diskLimitBytes: 100_000,
  networkRxBytes: null,
  networkTxBytes: null,
  ...overrides
});

describe('SqliteMonitoringRepository', () => {
  it('inserts every sample with all captured values', async () => {
    const database = createDatabase();
    const repository = new SqliteMonitoringRepository(database as never);

    await repository.insertSamples([sample(), sample({ scope: 'service', resourceId: 'service-1', cpuPercent: null, diskUsedBytes: null, diskLimitBytes: null, networkRxBytes: 10, networkTxBytes: 20 })]);

    expect(database.statements).toHaveLength(1);
    const insert = database.statements[0]!;
    expect(insert.sql).toContain('BEGIN TRANSACTION;');
    expect(insert.sql).toContain('INSERT INTO monitoring_samples');
    expect(insert.sql).toContain('COMMIT;');
    expect(insert.params).toHaveLength(22);
    expect(insert.params).toContain('host');
    expect(insert.params).toContain('host');
    expect(insert.params).toContain(12.5);
    expect(insert.params).toContain(8_000);
    expect(insert.params).toContain(40_000);
  });

  it('does not hit SQLite when inserting an empty sample batch', async () => {
    const database = createDatabase();
    const repository = new SqliteMonitoringRepository(database as never);

    await repository.insertSamples([]);

    expect(database.statements).toEqual([]);
  });

  it('queries history bucketed by time for chart-friendly point counts', async () => {
    const database = createDatabase();
    database.nextRows = [{ bucket: 1_755_085_200_000, cpu_percent: 10, memory_used_bytes: 8_000, memory_limit_bytes: 16_000, disk_used_bytes: 40_000, disk_limit_bytes: 100_000, network_rx_bytes: null, network_tx_bytes: null }];
    const repository = new SqliteMonitoringRepository(database as never);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const samples = await repository.listHistory('host', 'host', since, 600);

    const query = database.statements[0]!;
    expect(query.sql).toContain('FROM monitoring_samples');
    expect(query.sql).toContain('GROUP BY bucket');
    expect(query.params![0]).toBe(query.params![1]);
    expect(typeof query.params![0]).toBe('number');
    expect(query.params).toContain('host');
    expect(samples).toEqual([{
      capturedAt: new Date(1_755_085_200_000),
      cpuPercent: 10,
      memoryUsedBytes: 8_000,
      memoryLimitBytes: 16_000,
      diskUsedBytes: 40_000,
      diskLimitBytes: 100_000,
      networkRxBytes: null,
      networkTxBytes: null
    }]);
  });

  it('keeps raw granularity when the range already fits the point budget', async () => {
    const database = createDatabase();
    database.nextRows = [];
    const repository = new SqliteMonitoringRepository(database as never);
    const since = new Date(Date.now() - 60 * 1000);

    await repository.listHistory('host', 'host', since, 600);

    const bucketMs = database.statements[0]!.params![0];
    expect(bucketMs).toBe(1000);
  });

  it('deletes samples older than the retention cutoff', async () => {
    const database = createDatabase();
    const repository = new SqliteMonitoringRepository(database as never);
    const cutoff = new Date('2026-08-11T10:00:00.000Z');

    await repository.deleteOlderThan(cutoff);

    const statement = database.statements[0]!;
    expect(statement.sql).toContain('DELETE FROM monitoring_samples');
    expect(statement.params).toEqual([cutoff]);
  });
});
