import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('mobile overflow layout', () => {
  it('keeps the app shell shrinkable without hiding horizontal overflow', () => {
    const presenter = readSource('src/app/app-layout.presenter.ts');
    const app = readSource('src/app/app.component.ts');

    expect(presenter).toContain('min-w-0');
    expect(presenter).not.toContain('overflow-x-hidden');
    expect(app).toContain('class="flex-1 min-w-0 p-4 md:p-6"');
  });

  it('uses icon-only service actions in project service cards on mobile', () => {
    const source = readSource('src/app/pages/project-details-page.component.ts');

    expect(source).toContain('<span class="hidden sm:inline">Start</span>');
    expect(source).toContain('<span class="hidden sm:inline">Stop</span>');
    expect(source).toContain('<span class="hidden sm:inline">Restart</span>');
    expect(source).toContain('<span class="hidden sm:inline">Manage</span>');
  });

  it('allows catalog service cards to shrink within the mobile viewport', () => {
    const source = readSource('src/app/pages/catalog-page.component.ts');

    expect(source).toContain('grid-cols-[minmax(0,1fr)]');
    expect(source).toContain('card min-w-0 overflow-hidden');
    expect(source).toContain('truncate');
  });

  it('allows installed service cards to shrink long URLs and metadata on mobile', () => {
    const source = readSource('src/app/pages/installed-page.component.ts');

    expect(source).toContain('grid-cols-[minmax(0,1fr)]');
    expect(source).toContain('card min-w-0 overflow-hidden');
    expect(source).toContain('flex-col sm:flex-row');
    expect(source).toContain('break-all');
  });
});
