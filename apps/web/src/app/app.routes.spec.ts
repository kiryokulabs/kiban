import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/app/app.routes.ts'), 'utf8');

describe('app routes', () => {
  it('renders the dashboard route for the root URL', () => {
    expect(source).toContain("{ path: '', component: HomePageComponent, title: 'Kiban' }");
  });

  it('keeps the Angular wildcard fallback as the last route', () => {
    const routeLines = source
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('{ path:'));

    expect(routeLines.at(-1)).toBe("{ path: '**', redirectTo: '', pathMatch: 'full' },");
  });

  it('does not define a literal asterisk route', () => {
    expect(source).not.toContain("path: '*'");
  });
});
