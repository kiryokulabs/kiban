export interface RuntimeStatusDto {
  readonly dockerInstalled: boolean;
  readonly dockerRunning: boolean;
  readonly dockerVersion: string | null;
  readonly engineVersion: string | null;
  readonly socketReachable: boolean;
  readonly compatibleApiVersion: boolean;
  readonly availableRuntimes: readonly string[];
}
export interface ServiceRuntimeDto { readonly runtime: Readonly<Record<string, unknown>> | null; }
export interface ServiceLogsDto { readonly logs: string; }
