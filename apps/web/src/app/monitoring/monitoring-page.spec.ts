import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('monitoring page', () => {
  it('registers the monitoring route lazily', () => {
    const routes = readSource('src/app/app.routes.ts');

    expect(routes).toContain("path: 'monitoring'");
    expect(routes).toContain('loadComponent');
    expect(routes).toContain('MonitoringPageComponent');
    expect(routes).toContain('Monitoring · Kiban');
  });

  it('adds the monitoring entry to the sidebar navigation', () => {
    const app = readSource('src/app/app.component.ts');

    expect(app).toContain("{ label: 'Monitoring', path: '/monitoring', icon: 'activity' }");
  });

  it('adds an activity icon to the icon set', () => {
    const icons = readSource('src/app/shared/icons.component.ts');

    expect(icons).toContain("| 'activity'");
    expect(icons).toContain("@case ('activity')");
  });

  it('renders host resources, service health and recent changes sections', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('Host resources');
    expect(page).toContain('Service health');
    expect(page).toContain('Recent changes');
    expect(page).toContain('kiban-monitoring-chart');
  });

  it('links every service row to its management page', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain("[routerLink]=\"['/services', service.id]\"");
  });

  it('offers a catalog call to action when no services are installed', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('No services installed yet.');
    expect(page).toContain('routerLink="/catalog"');
  });

  it('polls the overview faster than the history', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('const OVERVIEW_REFRESH_MS = 10_000;');
    expect(page).toContain('const HISTORY_REFRESH_MS = 60_000;');
  });

  it('shows active alerts with severity badges', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('aria-label="Active alerts"');
    expect(page).toContain('alertBadgeClasses(alert.severity)');
  });

  it('degrades gracefully when monitoring data is unavailable', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('Monitoring data is temporarily unavailable.');
    expect(page).toContain('Runtime details are temporarily unavailable.');
  });

  it('scales every chart to its resource ceiling', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('[max]="100"');
    expect(page).toContain('[max]="current.host.memory.totalBytes"');
    expect(page).toContain('[max]="current.host.disk.totalBytes"');
  });

  it('shows usage percentages for host resource metrics', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('current.host.memory.usagePercent');
    expect(page).toContain('current.host.disk.usagePercent');
    expect(page).toContain('hostPresenter.percentLabel');
  });

  it('configures chart tooltip labels and value formatters', () => {
    const page = readSource('src/app/pages/monitoring-page.component.ts');

    expect(page).toContain('label="CPU"');
    expect(page).toContain('label="Memory"');
    expect(page).toContain('label="Disk"');
    expect(page).toContain('[valueFormatter]="percentFormatter"');
    expect(page).toContain('[valueFormatter]="bytesFormatter"');
  });
});

describe('monitoring chart component', () => {
  it('renders hover markers and a tooltip for the intersected point', () => {
    const chart = readSource('src/app/monitoring/monitoring-chart.component.ts');

    expect(chart).toContain('(mousemove)="showTooltip($event)"');
    expect(chart).toContain('(mouseleave)="hideTooltip()"');
    expect(chart).toContain('chartTooltip');
    expect(chart).toContain('current.timeLabel');
    expect(chart).toContain('current.percentLabel');
    expect(chart).toContain('current.valueLabel');
  });
});
