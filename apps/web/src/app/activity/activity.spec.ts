import '@angular/compiler';
import { HttpClient, HttpResponse, type HttpBackend } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HomePageComponent } from '../pages/home-page.component';
import { ProjectsService } from '../projects/projects.service';
import { ActivityApiService } from './activity-api.service';
import { ACTIVITY_PRESENTATION } from './activity.models';

vi.mock('../shared/icons.component', () => ({ IconsComponent: class {} }));
const event = { id: 'event-1', action: 'environment.deleted' as const, resourceName: 'QA', projectName: 'Example', environmentName: 'QA', actorEmail: 'operator@example.com', createdAt: '2026-11-04T12:00:00Z' };
class TestDashboard extends HomePageComponent {
  public get events() { return this.activity(); }
  public get failed() { return this.activityError(); }
  public get pending() { return this.activityLoading(); }
}

const createPage = (fail = false) => {
  const injector = Injector.create({ providers: [
    { provide: ProjectsService, useValue: { listProjects: () => of([]) } },
    { provide: ActivityApiService, useValue: { recent: () => fail ? throwError(() => new Error('unavailable')) : of([event]) } }
  ] });
  return runInInjectionContext(injector, () => new TestDashboard());
};

describe('Dashboard recent activity', () => {
  it('links to Events from a footer inside the recent activity card', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/pages/home-page.component.ts'), 'utf8');
    const card = source.match(/<aside[^>]*aria-labelledby="recent-activity-heading"[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(card).toMatch(/<footer[\s\S]*routerLink="\/events"[\s\S]*<\/footer>/);
  });

  it('reads only authenticated real activity, without a caller-controlled limit', () => {
    const backend: HttpBackend = { handle: request => {
      expect(request.url).toBe('/api/activity');
      expect(request.method).toBe('GET');
      expect(request.withCredentials).toBe(true);
      return of(new HttpResponse({ body: [event] }));
    } };
    new ActivityApiService(new HttpClient(backend)).recent().subscribe(events => expect(events).toEqual([event]));
  });

  it('loads real events including historical deleted resources without requiring links', () => {
    const page = createPage();
    expect(page.events).toEqual([event]);
    expect(page.pending).toBe(false);
    expect(page.failed).toBe(false);
    expect(ACTIVITY_PRESENTATION['environment.deleted']).toMatchObject({ verb: 'deleted', icon: 'trash' });
  });

  it('reports a read error rather than showing fabricated events', () => {
    const page = createPage(true);
    expect(page.failed).toBe(true);
    expect(page.pending).toBe(false);
    expect(page.events).toEqual([]);
  });
});
