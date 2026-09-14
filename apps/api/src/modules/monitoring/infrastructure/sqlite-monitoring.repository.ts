import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService, type SqliteRow } from '../../../database/database.service';
import type { MonitoringRepository } from '../application/monitoring-repository';
import type { MonitoringSample, MonitoringSampleInput, MonitoringScope } from '../application/monitoring.models';

interface MonitoringSampleRow extends SqliteRow {
  readonly bucket: number;
  readonly cpu_percent: number | null;
  readonly memory_used_bytes: number | null;
  readonly memory_limit_bytes: number | null;
  readonly disk_used_bytes: number | null;
  readonly disk_limit_bytes: number | null;
  readonly network_rx_bytes: number | null;
  readonly network_tx_bytes: number | null;
}

@Injectable()
export class SqliteMonitoringRepository implements MonitoringRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Persists a batch of monitoring samples. */
  public async insertSamples(samples: readonly MonitoringSampleInput[]): Promise<void> {
    if (samples.length === 0) return;
    const insert = 'INSERT INTO monitoring_samples (id, scope, resource_id, captured_at, cpu_percent, memory_used_bytes, memory_limit_bytes, disk_used_bytes, disk_limit_bytes, network_rx_bytes, network_tx_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
    const sql = `BEGIN TRANSACTION;\n${samples.map(() => insert).join('\n')}\nCOMMIT;`;
    const params = samples.flatMap((sample) => [randomUUID(), sample.scope, sample.resourceId, sample.capturedAt, sample.cpuPercent, sample.memoryUsedBytes, sample.memoryLimitBytes, sample.diskUsedBytes, sample.diskLimitBytes, sample.networkRxBytes, sample.networkTxBytes]);
    await this.database.run(sql, params);
  }

  /** Returns samples for one scope and resource, bucketed to at most maxPoints points. */
  public async listHistory(scope: MonitoringScope, resourceId: string, since: Date, maxPoints: number): Promise<readonly MonitoringSample[]> {
    const rangeMs = Math.max(0, Date.now() - since.getTime());
    const bucketMs = Math.max(1000, Math.ceil(rangeMs / Math.max(1, maxPoints)));
    const rows = await this.database.all<MonitoringSampleRow>(
      'SELECT (captured_at / ?) * ? AS bucket, AVG(cpu_percent) AS cpu_percent, AVG(memory_used_bytes) AS memory_used_bytes, AVG(memory_limit_bytes) AS memory_limit_bytes, AVG(disk_used_bytes) AS disk_used_bytes, AVG(disk_limit_bytes) AS disk_limit_bytes, AVG(network_rx_bytes) AS network_rx_bytes, AVG(network_tx_bytes) AS network_tx_bytes FROM monitoring_samples WHERE scope = ? AND resource_id = ? AND captured_at >= ? GROUP BY bucket ORDER BY bucket',
      [bucketMs, bucketMs, scope, resourceId, since]
    );
    return rows.map((row) => this.toSample(row));
  }

  /** Deletes every sample captured before the cutoff. */
  public deleteOlderThan(cutoff: Date): Promise<void> {
    return this.database.run('DELETE FROM monitoring_samples WHERE captured_at < ?', [cutoff]);
  }

  private toSample(row: MonitoringSampleRow): MonitoringSample {
    return {
      capturedAt: new Date(row.bucket),
      cpuPercent: row.cpu_percent,
      memoryUsedBytes: row.memory_used_bytes,
      memoryLimitBytes: row.memory_limit_bytes,
      diskUsedBytes: row.disk_used_bytes,
      diskLimitBytes: row.disk_limit_bytes,
      networkRxBytes: row.network_rx_bytes,
      networkTxBytes: row.network_tx_bytes
    };
  }
}
