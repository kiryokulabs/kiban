/** Generic runtime unit stats exposed to monitoring without leaking runtime-engine concepts. */
export interface FleetRuntimeUnitStats {
  readonly runtimeUnitId: string;
  readonly runtimeUnitName: string;
  readonly projectName: string | null;
  readonly state: string;
  readonly health: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  readonly cpuPercent: number | null;
  readonly memoryUsedBytes: number | null;
  readonly memoryLimitBytes: number | null;
  readonly networkRxBytes: number | null;
  readonly networkTxBytes: number | null;
  readonly restartCount: number | null;
  readonly startedAt: string | null;
}

/** Runtime-wide stats for units managed by Kiban's active runtime backend. */
export interface FleetRuntimeStats {
  readonly units: readonly FleetRuntimeUnitStats[];
  readonly available: boolean;
  readonly message: string | null;
}
