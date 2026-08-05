import { parse } from 'yaml';
import type { CatalogValidationIssue } from '@kiban/core';
import type { ComposeValidationContext } from './compose.validator';

export interface ComposeParseResult {
  readonly document: unknown;
  readonly issues: readonly CatalogValidationIssue[];
}

/**
 * Parses a compose.yml source string into a plain object using the `yaml`
 * library. Only syntax errors are handled here; structural validation belongs
 * to the Compose Validator.
 */
export function parseComposeYaml(source: string, context: ComposeValidationContext): ComposeParseResult {
  try {
    return { document: parse(source), issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      document: undefined,
      issues: [{ file: context.file, service: '<root>', reason: `invalid YAML: ${message}` }]
    };
  }
}
