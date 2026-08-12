const COMPOSE_FALLBACK_PATTERN = /^\$\{[^:}]+:-(.*)\}$/;

/** Resolves a schema default into the real value that should be sent to the API. */
export function resolveSchemaDefaultValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = COMPOSE_FALLBACK_PATTERN.exec(value);
  return match ? match[1] ?? '' : value;
}
