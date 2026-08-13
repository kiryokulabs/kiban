/**
 * RuntimeSpec is the neutral, compose-derived description of how a service
 * runs. It is produced by the Compose Normalizer (Infrastructure) and consumed
 * by RuntimeProviders (Infrastructure). It intentionally contains no Docker
 * vocabulary (no containers, networks, compose): image / port / volume /
 * environment are runtime abstractions shared by any provider.
 */

export type ComposeRestartPolicy = 'no' | 'always' | 'on-failure' | 'unless-stopped';

/** A container port a compose service exposes. The host side is Kiban's concern. */
export interface RuntimeServicePort {
  readonly port: number;
  readonly protocol: 'tcp' | 'udp';
}

/**
 * An environment variable a compose service declares.
 * `value` is the resolved default (from `${VAR:-default}` or a plain value).
 * `required` is true when no default exists (bare `${VAR}`).
 * `sourceVariableName` is present when the value comes from a compose
 * interpolation variable such as `POSTGRES_PASSWORD: ${SERVICE_PASSWORD_DB}`.
 * `sourceVariableNames` includes every interpolation variable referenced by
 * composed values such as `DATABASE_URL: postgres://${USER}:${PASSWORD}@db`.
 */
export interface RuntimeEnvironmentEntry {
  readonly key: string;
  readonly value?: string;
  readonly required: boolean;
  readonly sourceVariableName?: string;
  readonly sourceVariableNames?: readonly string[];
}

/** A volume mount. `name` is present for named volumes, absent for anonymous. */
export interface RuntimeVolumeMount {
  readonly name?: string;
  readonly target: string;
}

/** A compose healthcheck, normalized to seconds. */
export interface RuntimeHealthcheck {
  readonly test: readonly string[];
  readonly intervalSeconds?: number;
  readonly timeoutSeconds?: number;
  readonly retries?: number;
  readonly startPeriodSeconds?: number;
}

/** One compose service normalized into runtime-neutral form. */
export interface RuntimeService {
  readonly name: string;
  readonly image: string;
  readonly tag: string;
  /** Exec form. String commands are converted to shell form at load time. */
  readonly command?: readonly string[];
  readonly entrypoint?: readonly string[];
  readonly ports: readonly RuntimeServicePort[];
  readonly environment: readonly RuntimeEnvironmentEntry[];
  readonly volumes: readonly RuntimeVolumeMount[];
  readonly restart: ComposeRestartPolicy;
  readonly dependsOn: readonly string[];
  readonly healthcheck?: RuntimeHealthcheck;
  readonly labels: Readonly<Record<string, string>>;
}

/** The normalized deployment description of an entire compose document. */
export interface RuntimeSpec {
  readonly services: readonly RuntimeService[];
}
