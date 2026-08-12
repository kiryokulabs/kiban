/**
 * Validation model for the Service Catalog.
 *
 * Every catalog issue must indicate:
 * - file: which file the problem was found in (e.g. `catalog/databases/postgresql/compose.yml`)
 * - service: which service (folder id, or a specific compose service name)
 * - reason: a human-readable description
 *
 * The Catalog Loader aggregates issues for the whole catalog. The boot process
 * refuses to start when any issue exists.
 */

export interface CatalogValidationIssue {
  readonly file: string;
  readonly service: string;
  readonly reason: string;
}

/** Raised (or aggregated) when one or more catalog validation rules fail. */
export class CatalogValidationError extends Error {
  public readonly issues: readonly CatalogValidationIssue[];

  public constructor(issues: readonly CatalogValidationIssue[]) {
    super(`Catalog validation failed with ${issues.length} issue(s).`);
    this.name = 'CatalogValidationError';
    this.issues = issues;
  }
}
