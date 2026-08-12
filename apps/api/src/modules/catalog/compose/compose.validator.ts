import type { CatalogValidationIssue } from '@kiban/core';

/** Context carried into every issue produced while validating a compose document. */
export interface ComposeValidationContext {
  readonly file: string;
}

/** Top-level compose keys Kiban understands. Anything else is rejected. */
const TOP_LEVEL_KEYS = new Set(['services', 'volumes']);

/** Service-level compose keys Kiban understands. Anything else is rejected. */
const SERVICE_KEYS = new Set([
  'image',
  'command',
  'entrypoint',
  'ports',
  'environment',
  'volumes',
  'restart',
  'depends_on',
  'healthcheck',
  'labels'
]);

/** Long-form port keys Kiban understands. */
const PORT_LONG_KEYS = new Set(['target', 'protocol']);

const PORT_PROTOCOLS = new Set(['tcp', 'udp']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

/**
 * Validates the structural shape of a parsed compose document and rejects any
 * compose feature outside the supported subset. Produces one issue per problem;
 * empty result means the document is structurally valid.
 */
export function validateComposeDocument(
  document: unknown,
  context: ComposeValidationContext
): readonly CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const add = (service: string, reason: string): void => {
    issues.push({ file: context.file, service, reason });
  };

  if (!isObject(document)) {
    add('<root>', 'compose document must be an object');
    return issues;
  }

  for (const key of Object.keys(document)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      add('<root>', `unsupported compose feature: top-level key "${key}"`);
    }
  }

  const services = document['services'];
  if (!isObject(services) || Object.keys(services).length === 0) {
    add('<root>', 'compose document must define at least one service under "services"');
    return issues;
  }

  for (const [name, rawService] of Object.entries(services)) {
    const servicePath = `services.${name}`;
    if (!isObject(rawService)) {
      add(servicePath, 'service definition must be an object');
      continue;
    }

    for (const key of Object.keys(rawService)) {
      if (!SERVICE_KEYS.has(key)) {
        add(servicePath, `unsupported compose feature: service key "${key}"`);
      }
    }

    const image = rawService['image'];
    if (typeof image !== 'string' || image.length === 0) {
      add(servicePath, 'service must declare a non-empty string "image"');
    }

    const ports = rawService['ports'];
    if (ports !== undefined && !Array.isArray(ports)) {
      add(servicePath, '"ports" must be an array');
    } else if (Array.isArray(ports)) {
      for (const entry of ports) {
        if (typeof entry === 'string') {
          const containerSide = entry.split(':').pop() ?? '';
          if (containerSide.includes('-')) {
            add(servicePath, `unsupported compose feature: port ranges are not supported ("${entry}")`);
          } else if (!/^\d+(\/(tcp|udp))?$/.test(containerSide)) {
            add(servicePath, `invalid port entry "${entry}"`);
          }
        } else if (isObject(entry)) {
          for (const key of Object.keys(entry)) {
            if (!PORT_LONG_KEYS.has(key)) {
              add(servicePath, `unsupported compose feature: long-form port key "${key}"`);
            }
          }
          if (typeof entry['target'] !== 'number') {
            add(servicePath, 'long-form port must declare a numeric "target"');
          }
          const protocol = entry['protocol'];
          if (protocol !== undefined && (typeof protocol !== 'string' || !PORT_PROTOCOLS.has(protocol))) {
            add(servicePath, 'port protocol must be "tcp" or "udp"');
          }
        } else {
          add(servicePath, 'port entries must be strings or objects');
        }
      }
    }

    const environment = rawService['environment'];
    if (environment !== undefined && !isObject(environment) && !Array.isArray(environment)) {
      add(servicePath, '"environment" must be a map or a list of KEY=value strings');
    } else if (Array.isArray(environment)) {
      for (const entry of environment) {
        if (typeof entry !== 'string' || !entry.includes('=')) {
          add(servicePath, 'list-form environment entries must be "KEY=value" strings');
        }
      }
    }

    const volumes = rawService['volumes'];
    if (volumes !== undefined && !Array.isArray(volumes)) {
      add(servicePath, '"volumes" must be an array');
    } else if (Array.isArray(volumes)) {
      for (const entry of volumes) {
        if (typeof entry === 'string') continue;
        if (isObject(entry)) {
          if (entry['type'] === 'bind') {
            add(servicePath, 'unsupported compose feature: bind mounts are not supported');
          }
        } else {
          add(servicePath, 'volume entries must be strings or objects');
        }
      }
    }

    const labels = rawService['labels'];
    if (labels !== undefined && !isObject(labels)) {
      add(servicePath, '"labels" must be a map');
    }

    const healthcheck = rawService['healthcheck'];
    if (healthcheck !== undefined && !isObject(healthcheck)) {
      add(servicePath, '"healthcheck" must be an object');
    }

    const restart = rawService['restart'];
    if (restart !== undefined && typeof restart !== 'string') {
      add(servicePath, '"restart" must be a string');
    }

    const command = rawService['command'];
    if (command !== undefined && typeof command !== 'string' && !isStringArray(command)) {
      add(servicePath, '"command" must be a string or a list of strings');
    }

    const entrypoint = rawService['entrypoint'];
    if (entrypoint !== undefined && typeof entrypoint !== 'string' && !isStringArray(entrypoint)) {
      add(servicePath, '"entrypoint" must be a string or a list of strings');
    }

    const dependsOn = rawService['depends_on'];
    if (dependsOn !== undefined && !isObject(dependsOn) && !isStringArray(dependsOn)) {
      add(servicePath, '"depends_on" must be a list of service names or a map');
    }
  }

  return issues;
}
