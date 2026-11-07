import '@angular/compiler';
import { HttpClient, HttpResponse, type HttpBackend } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { EventsPageComponent } from '../pages/events-page.component';
import { ActivityApiService } from './activity-api.service';
import type { ActivityPage } from './activity.models';

vi.mock('../shared/icons.component', () => ({ IconsComponent: class {} }));
vi.mock('./events-header.component', () => ({ EventsHeaderComponent: class {} }));
const read = (path: string): string => readFileSync(resolve(process.cwd(), 'src/app', path), 'utf8');
const response: ActivityPage = { items: [], page: 1, hasMore: true, total: 41 };
class TestEventsPage extends EventsPageComponent {
  public get currentPage() { return this.page(); }
  public get eventCount() { return this.total(); }
  public get rows() { return this.events(); }
  public get failed() { return this.error(); }
  public get pending() { return this.loading(); }
  public go(page: number): void { this.loadPage(page); }
}
const createPage = () => {
  const api = { history: vi.fn(() => of(response)) };
  const injector = Injector.create({ providers: [{ provide: ActivityApiService, useValue: api }] });
  return { page: runInInjectionContext(injector, () => new TestEventsPage()), api };
};

describe('Events and Logs navigation', () => {
  it('uses a single Events sidebar entry, defaults to Events and preserves old log bookmarks', () => {
    const sidebar = read('app.component.ts');
    expect(sidebar).toContain("{ label: 'Events', path: '/events', icon: 'logs' }");
    expect(sidebar).not.toContain("{ label: 'Logs', path:");
    const routes = read('app.routes.ts');
    expect(routes).toContain("path: 'events', loadComponent:");
    expect(routes).toContain("{ path: 'events/logs', component: LogsPageComponent");
    expect(routes).toContain("{ path: 'logs', redirectTo: 'events/logs', pathMatch: 'full' }");
  });

  it('uses button-style links like Project Settings, not a local tab that cannot be bookmarked', () => {
    const header = read('activity/events-header.component.ts');
    expect(header).toContain('routerLink="/events"');
    expect(header).toContain('routerLink="/events/logs"');
    expect(header).toContain('btn gap-1.5');
    expect(header).toContain('[class.btn-ghost]');
    expect(header).toContain('[attr.aria-current]');
    expect(read('pages/events-page.component.ts')).toContain('<kiban-events-header active="events" />');
    expect(read('pages/logs-page.component.ts')).toContain('<kiban-events-header active="logs" />');
    expect(header).not.toContain('adminOnly');
  });

  it('changes pages only through API calls, without changing the browser route or query parameters', () => {
    const source = read('pages/events-page.component.ts');
    expect(source).toContain('this.api.history(page)');
    expect(source).not.toMatch(/navigate|queryParams|pushState|replaceState|window\.location/);
    const { page, api } = createPage();
    page.go(2);
    expect(api.history).toHaveBeenLastCalledWith(2);
  });

  it('displays the total stored events, not the number on the current page', () => {
    const { page, api } = createPage();
    expect(page.eventCount).toBe(41);
    api.history.mockReturnValueOnce(of({ ...response, page: 2, total: 42 }));
    page.go(2);
    expect(page.eventCount).toBe(42);
    expect(read('pages/events-page.component.ts')).toContain('{{ total() }}');
  });

  it('loads the first history page by default and requests subsequent pages', () => {
    const { page, api } = createPage();
    expect(api.history).toHaveBeenCalledWith(1);
    expect(page.currentPage).toBe(1);
    expect(page.pending).toBe(false);
    api.history.mockReturnValueOnce(of({ ...response, page: 2, hasMore: false }));
    page.go(2);
    expect(page.currentPage).toBe(2);
    expect(api.history).toHaveBeenLastCalledWith(2);
  });

  it('handles errors without pretending the event history is empty and prevents overlapping requests', () => {
    const { page, api } = createPage();
    const pending = new Subject<ActivityPage>();
    api.history.mockImplementationOnce(() => pending);
    page.go(2);
    page.go(3);
    expect(api.history).toHaveBeenCalledTimes(2);
    pending.next({ ...response, page: 2 });
    pending.complete();
    api.history.mockImplementationOnce(() => throwError(() => new Error('failed')));
    page.go(3);
    expect(page.failed).toBe(true);
    expect(page.pending).toBe(false);
    expect(page.currentPage).toBe(2);
  });

  it('requests paginated history with credentials without altering dashboard requests', () => {
    const backend: HttpBackend = { handle: request => {
      expect(request.url).toBe('/api/activity/history');
      expect(request.params.get('page')).toBe('2');
      expect(request.withCredentials).toBe(true);
      return of(new HttpResponse({ body: response }));
    } };
    new ActivityApiService(new HttpClient(backend)).history(2).subscribe();
  });
});
