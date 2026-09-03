import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/app/app.component.ts'), 'utf8');
const sidebarSource = readFileSync(resolve(process.cwd(), 'src/app/shared/sidebar.component.ts'), 'utf8');

describe('mobile metrics layout', () => {
  it('renders header metrics only outside mobile viewport', () => {
    expect(appSource).toContain('viewport.isMobile()');
    expect(appSource).toContain('<kiban-system-metrics-header />');
    expect(appSource).toContain('@if (!viewport.isMobile())');
  });

  it('renders system metrics inside the mobile sidebar drawer', () => {
    expect(sidebarSource).toContain('SystemMetricsHeaderComponent');
    expect(sidebarSource).toContain("displayMode() === 'mobile'");
    expect(sidebarSource).toContain('<kiban-system-metrics-header [compact]="true" />');
  });
});

const metricsSource = readFileSync(resolve(process.cwd(), 'src/app/system/system-metrics-header.component.ts'), 'utf8');

describe('compact system metrics layout', () => {
  it('can hide secondary labels when rendered in constrained mobile surfaces', () => {
    expect(metricsSource).toContain('readonly compact = input(false)');
    expect(metricsSource).toContain('@if (!compact())');
  });
});
