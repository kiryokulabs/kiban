import { describe, expect, it } from 'vitest';
import type { CatalogValidationIssue } from '@kiban/core';
import { formatCatalogReport } from './catalog-boot';

const issue: CatalogValidationIssue = {
  file: 'catalog/databases/postgresql/compose.yaml',
  service: 'postgresql',
  reason: 'missing required file "schema.json"'
};

describe('formatCatalogReport', () => {
  it('includes the service name for each issue', () => {
    expect(formatCatalogReport([issue])).toContain('postgresql');
  });

  it('includes the file path for each issue', () => {
    expect(formatCatalogReport([issue])).toContain('catalog/databases/postgresql/compose.yaml');
  });

  it('includes the reason for each issue', () => {
    expect(formatCatalogReport([issue])).toContain('missing required file "schema.json"');
  });

  it('includes all issues when multiple exist', () => {
    const issues: readonly CatalogValidationIssue[] = [
      { file: 'a/compose.yaml', service: 'svc-a', reason: 'reason-a' },
      { file: 'b/compose.yaml', service: 'svc-b', reason: 'reason-b' }
    ];
    const report = formatCatalogReport(issues);
    expect(report).toContain('svc-a');
    expect(report).toContain('reason-a');
    expect(report).toContain('svc-b');
    expect(report).toContain('reason-b');
  });

  it('returns a non-empty string for a non-empty issues list', () => {
    expect(formatCatalogReport([issue]).trim().length).toBeGreaterThan(0);
  });
});
