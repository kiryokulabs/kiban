import type { MonitoringSample, MonitoringSampleInput, MonitoringScope } from './monitoring.models';

/** Persists and queries monitoring samples. */
export interface MonitoringRepository {
  insertSamples(samples: readonly MonitoringSampleInput[]): Promise<void>;
  listHistory(scope: MonitoringScope, resourceId: string, since: Date, maxPoints: number): Promise<readonly MonitoringSample[]>;
  deleteOlderThan(cutoff: Date): Promise<void>;
}

export const MONITORING_REPOSITORY = Symbol('MONITORING_REPOSITORY');
