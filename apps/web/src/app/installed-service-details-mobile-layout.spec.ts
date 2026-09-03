import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const detailsSource = readFileSync(resolve(process.cwd(), 'src/app/pages/installed-service-details-page.component.ts'), 'utf8');
const terminalSource = readFileSync(resolve(process.cwd(), 'src/app/terminal/terminal.component.ts'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'src/app/app.component.ts'), 'utf8');
const appLayoutSource = readFileSync(resolve(process.cwd(), 'src/app/app-layout.presenter.ts'), 'utf8');

describe('installed service details mobile layout', () => {
  it('does not hide horizontal overflow at the global app shell level', () => {
    expect(appSource).not.toContain('overflow-x-hidden p-4 md:p-6');
    expect(appLayoutSource).not.toContain('overflow-x-hidden');
  });

  it('keeps detail cards and grids shrinkable on mobile', () => {
    expect(detailsSource).toContain('grid grid-cols-[minmax(0,1fr)]');
    expect(detailsSource).toContain('card min-w-0');
    expect(detailsSource).toContain('min-w-0 break-all');
  });

  it('stacks crowded detail rows on mobile instead of implying horizontal scroll', () => {
    expect(detailsSource).toContain('flex flex-col gap-2 sm:flex-row');
    expect(detailsSource).toContain('items-start sm:items-center');
  });

  it('keeps terminal layout constrained inside its card on mobile', () => {
    expect(detailsSource).toContain('card min-w-0 overflow-hidden p-0');
    expect(detailsSource).toContain('class="flex min-h-0 min-w-0 flex-1 flex-col"');
    expect(terminalSource).toContain('min-w-0 overflow-hidden');
    expect(terminalSource).toContain('flex flex-wrap');
    expect(terminalSource).toContain('w-full min-w-0 flex-1 sm:w-auto');
  });

  it('wraps log toolbar controls and keeps log text inside the card width', () => {
    expect(detailsSource).toContain('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between');
    expect(detailsSource).toContain('overflow-y-auto');
    expect(detailsSource).toContain('whitespace-pre-wrap break-words');
    expect(detailsSource).not.toContain('overflow-auto rounded-lg border kb-border p-3 text-xs c-muted');
  });
});
