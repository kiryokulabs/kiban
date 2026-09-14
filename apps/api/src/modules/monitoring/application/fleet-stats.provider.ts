import type { FleetStats } from './monitoring.models';

/** Reads aggregated runtime stats for every runtime unit managed by Kiban. */
export interface FleetStatsProvider {
  getFleetStats(): Promise<FleetStats>;
}

export const FLEET_STATS_PROVIDER = Symbol('FLEET_STATS_PROVIDER');
