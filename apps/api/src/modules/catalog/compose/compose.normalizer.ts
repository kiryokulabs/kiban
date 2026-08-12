import type {
  CatalogValidationIssue,
  ComposeRestartPolicy,
  RuntimeEnvironmentEntry,
  RuntimeHealthcheck,
  RuntimeService,
  RuntimeServicePort,
  RuntimeSpec,
  RuntimeVolumeMount
} from '@kiban/core';
import type { ComposeValidationContext } from './compose.validator';

const RESTART_POLICIES = new Set<ComposeRestartPolicy>(['no', 'always', 'on-failure', 'unless-stopped']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Parses a compose duration (e.g. "30s", "5m", "1h") into seconds. */
const parseDuration = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(value);
  if (!match) return undefined;
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'ms':
      return amount / 1000;
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    default:
      return undefined;
  }
};

const ENV_TEMPLATE = /^\$\{([A-Za-z_][A-Za-z0-9_]*)(:-((?:[^}])*))?}$/;

/** Resolves a compose environment value into a typed entry. */
const resolveEnvironmentValue = (key: string, raw: unknown): RuntimeEnvironmentEntry => {
  if (typeof raw === 'string') {
    const match = ENV_TEMPLATE.exec(raw);
    if (match) {
      if (match[2] !== undefined) {
        return { key, value: match[2]!.slice(2), required: false };
      }
      return { key, required: true };
    }
    return { key, value: raw, required: false };
  }
  if (raw === null || raw === undefined) {
    return { key, required: true };
  }
  return { key, value: String(raw), required: false };
};

const parsePort = (entry: unknown): RuntimeServicePort | undefined => {
  if (typeof entry === 'string') {
    const containerSide = entry.split(':').pop() ?? '';
    const match = /^(\d+)(\/(tcp|udp))?$/.exec(containerSide);
    if (!match) return undefined;
    return { port: Number(match[1]), protocol: match[3] === 'udp' ? 'udp' : 'tcp' };
  }
  if (isObject(entry)) {
    const target = entry['target'];
    if (typeof target !== 'number') return undefined;
    return { port: target, protocol: entry['protocol'] === 'udp' ? 'udp' : 'tcp' };
  }
  return undefined;
};

const parseVolume = (entry: unknown): RuntimeVolumeMount | undefined => {
  if (typeof entry === 'string') {
    const colon = entry.indexOf(':');
    if (colon < 0) return { target: entry };
    return { name: entry.slice(0, colon), target: entry.slice(colon + 1) };
  }
  if (isObject(entry)) {
    const source = entry['source'];
    const target = entry['target'];
    if (typeof source !== 'string' || typeof target !== 'string') return undefined;
    return { name: source, target };
  }
  return undefined;
};

const toShellForm = (value: string): readonly string[] => ['/bin/sh', '-c', value];

/** Parses a healthcheck test string per compose semantics (CMD / CMD-SHELL / NONE). */
const parseHealthcheckTest = (value: string): readonly string[] => {
  const match = /^(CMD|CMD-SHELL|NONE)(?:\s+(.*))?$/.exec(value);
  if (!match) return ['CMD-SHELL', value];
  if (match[1] === 'NONE') return ['NONE'];
  return match[2] ? [match[1]!, match[2]] : [match[1]!];
};

/**
 * Normalizes a validated compose document into a neutral RuntimeSpec.
 * Returns no spec when any issue is found; issues always explain file, service
 * and reason so the catalog loader can aggregate them into the boot report.
 */
export function normalizeComposeDocument(
  document: unknown,
  context: ComposeValidationContext
): { readonly spec?: RuntimeSpec; readonly issues: readonly CatalogValidationIssue[] } {
  const issues: CatalogValidationIssue[] = [];
  const add = (service: string, reason: string): void => {
    issues.push({ file: context.file, service, reason });
  };

  if (!isObject(document) || !isObject(document['services'])) {
    add('<root>', 'compose document must define services');
    return { issues };
  }

  const declaredVolumes = isObject(document['volumes']) ? document['volumes'] : {};
  const serviceNames = Object.keys(document['services'] as Record<string, unknown>);
  const services: RuntimeService[] = [];

  for (const [name, raw] of Object.entries(document['services'] as Record<string, unknown>)) {
    if (!isObject(raw)) {
      add(`services.${name}`, 'service definition must be an object');
      continue;
    }

    const imageValue = raw['image'];
    if (typeof imageValue !== 'string' || imageValue.length === 0) {
      add(`services.${name}`, 'service must declare a non-empty string "image"');
      continue;
    }
    const separator = imageValue.lastIndexOf(':');
    const image = separator > 0 ? imageValue.slice(0, separator) : imageValue;
    const tag = separator > 0 ? imageValue.slice(separator + 1) : 'latest';

    const restart = raw['restart'];
    const restartPolicy: ComposeRestartPolicy =
      typeof restart === 'string' && RESTART_POLICIES.has(restart as ComposeRestartPolicy)
        ? (restart as ComposeRestartPolicy)
        : 'no';

    const command = raw['command'];
    const commandValue = typeof command === 'string' ? toShellForm(command) : Array.isArray(command) ? command : undefined;

    const entrypoint = raw['entrypoint'];
    const entrypointValue =
      typeof entrypoint === 'string' ? toShellForm(entrypoint) : Array.isArray(entrypoint) ? entrypoint : undefined;

    const ports: RuntimeServicePort[] = [];
    if (Array.isArray(raw['ports'])) {
      for (const entry of raw['ports']) {
        const parsed = parsePort(entry);
        if (parsed) ports.push(parsed);
      }
    }

    const environment: RuntimeEnvironmentEntry[] = [];
    const envRaw = raw['environment'];
    if (isObject(envRaw)) {
      for (const [key, value] of Object.entries(envRaw)) {
        environment.push(resolveEnvironmentValue(key, value));
      }
    } else if (Array.isArray(envRaw)) {
      const seen = new Map<string, RuntimeEnvironmentEntry>();
      for (const entry of envRaw) {
        if (typeof entry !== 'string') continue;
        const equals = entry.indexOf('=');
        if (equals < 0) continue;
        const key = entry.slice(0, equals);
        const value = entry.slice(equals + 1);
        seen.set(key, resolveEnvironmentValue(key, value));
      }
      environment.push(...seen.values());
    }

    const volumes: RuntimeVolumeMount[] = [];
    if (Array.isArray(raw['volumes'])) {
      for (const entry of raw['volumes']) {
        const parsed = parseVolume(entry);
        if (!parsed) continue;
        if (parsed.name !== undefined && !(parsed.name in declaredVolumes)) {
          add(`services.${name}`, `volume "${parsed.name}" is not declared at the top level`);
          continue;
        }
        volumes.push(parsed);
      }
    }

    const dependsOnRaw = raw['depends_on'];
    const dependsOn: string[] = [];
    if (Array.isArray(dependsOnRaw)) {
      dependsOn.push(...dependsOnRaw.filter((entry): entry is string => typeof entry === 'string'));
    } else if (isObject(dependsOnRaw)) {
      dependsOn.push(...Object.keys(dependsOnRaw));
    }
    for (const dependency of dependsOn) {
      if (!serviceNames.includes(dependency)) {
        add(`services.${name}`, `depends_on references unknown service "${dependency}"`);
      }
    }

    let healthcheck: RuntimeHealthcheck | undefined;
    const healthcheckRaw = raw['healthcheck'];
    if (isObject(healthcheckRaw)) {
      const testRaw = healthcheckRaw['test'];
      let test: readonly string[] | undefined;
      if (Array.isArray(testRaw) && testRaw.every((entry) => typeof entry === 'string')) {
        test = testRaw;
      } else if (typeof testRaw === 'string') {
        test = parseHealthcheckTest(testRaw);
      }
      if (!test) {
        add(`services.${name}`, 'healthcheck "test" must be a string or a list of strings');
      }
      const intervalSeconds = parseDuration(healthcheckRaw['interval']);
      if (healthcheckRaw['interval'] !== undefined && intervalSeconds === undefined) {
        add(`services.${name}`, `invalid healthcheck "interval" duration "${String(healthcheckRaw['interval'])}"`);
      }
      const timeoutSeconds = parseDuration(healthcheckRaw['timeout']);
      if (healthcheckRaw['timeout'] !== undefined && timeoutSeconds === undefined) {
        add(`services.${name}`, `invalid healthcheck "timeout" duration "${String(healthcheckRaw['timeout'])}"`);
      }
      const startPeriodSeconds = parseDuration(healthcheckRaw['start_period']);
      if (healthcheckRaw['start_period'] !== undefined && startPeriodSeconds === undefined) {
        add(`services.${name}`, `invalid healthcheck "start_period" duration "${String(healthcheckRaw['start_period'])}"`);
      }
      const retries = healthcheckRaw['retries'];
      if (retries !== undefined && typeof retries !== 'number') {
        add(`services.${name}`, 'healthcheck "retries" must be a number');
      }
      if (test) {
        healthcheck = {
          test,
          ...(intervalSeconds !== undefined ? { intervalSeconds } : {}),
          ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
          ...(typeof retries === 'number' ? { retries } : {}),
          ...(startPeriodSeconds !== undefined ? { startPeriodSeconds } : {})
        };
      }
    }

    const labels: Record<string, string> = {};
    if (isObject(raw['labels'])) {
      for (const [key, value] of Object.entries(raw['labels'])) {
        labels[key] = value === null || value === undefined ? '' : String(value);
      }
    }

    services.push({
      name,
      image,
      tag,
      ...(commandValue !== undefined ? { command: commandValue } : {}),
      ...(entrypointValue !== undefined ? { entrypoint: entrypointValue } : {}),
      ports,
      environment,
      volumes,
      restart: restartPolicy,
      dependsOn,
      ...(healthcheck !== undefined ? { healthcheck } : {}),
      labels
    });
  }

  if (issues.length > 0) {
    return { issues };
  }
  return { spec: { services }, issues };
}
