import type { CatalogValidationIssue } from '@kiban/core';

/**
 * Formats a list of CatalogValidationIssues into a human-readable report string.
 * Extracted as a pure function so it can be tested without triggering process.exit.
 */
export function formatCatalogReport(issues: readonly CatalogValidationIssue[]): string {
  const lines: string[] = [
    '',
    '╔══ Kiban — Catalog Validation Failed ══════════════════════════╗',
    '║  The service catalog has errors. Refusing to start.          ║',
    '╠═══════════════════════════════════════════════════════════════╣'
  ];

  for (const issue of issues) {
    lines.push(`║  [${issue.service}]`);
    lines.push(`║     ${issue.file}`);
    lines.push(`║     └─ ${issue.reason}`);
  }

  lines.push('╚═══════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}
