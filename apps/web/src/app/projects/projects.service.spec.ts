import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ProjectsService } from './projects.service';

interface HttpCall { readonly method: string; readonly url: string; readonly body?: unknown; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); }),
    post: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'POST', url, body, options }); return of(response); }),
    patch: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'PATCH', url, body, options }); return of(response); }),
    delete: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'DELETE', url, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web ProjectsService', () => {
  it('lists projects with credentials', () => {
    const { http, calls } = createHttpClient([]);
    const service = new ProjectsService(http);
    service.listProjects().subscribe();
    expect(calls).toEqual([{ method: 'GET', url: 'http://localhost:3000/projects', options: { withCredentials: true } }]);
  });

  it('creates a project with credentials', () => {
    const payload = { name: 'CrossMetrics', description: 'Analytics' };
    const { http, calls } = createHttpClient({ id: 'project-1' });
    const service = new ProjectsService(http);
    service.createProject(payload).subscribe();
    expect(calls).toEqual([{ method: 'POST', url: 'http://localhost:3000/projects', body: payload, options: { withCredentials: true } }]);
  });

  it('gets project details with credentials', () => {
    const { http, calls } = createHttpClient({ id: 'project-1' });
    const service = new ProjectsService(http);
    service.getProject('project-1').subscribe();
    expect(calls).toEqual([{ method: 'GET', url: 'http://localhost:3000/projects/project-1', options: { withCredentials: true } }]);
  });

  it('updates a project with credentials', () => {
    const payload = { name: 'Updated', description: null };
    const { http, calls } = createHttpClient({ id: 'project-1' });
    const service = new ProjectsService(http);
    service.updateProject('project-1', payload).subscribe();
    expect(calls).toEqual([{ method: 'PATCH', url: 'http://localhost:3000/projects/project-1', body: payload, options: { withCredentials: true } }]);
  });

  it('deletes a project with credentials', () => {
    const { http, calls } = createHttpClient(null);
    const service = new ProjectsService(http);
    service.deleteProject('project-1').subscribe();
    expect(calls).toEqual([{ method: 'DELETE', url: 'http://localhost:3000/projects/project-1', options: { withCredentials: true } }]);
  });

  it('lists environments for a project with credentials', () => {
    const { http, calls } = createHttpClient([]);
    const service = new ProjectsService(http);
    service.listEnvironments('project-1').subscribe();
    expect(calls).toEqual([{ method: 'GET', url: 'http://localhost:3000/projects/project-1/environments', options: { withCredentials: true } }]);
  });
});

describe('Web ProjectsService environments', () => {
  it('creates a custom environment with credentials', () => {
    const payload = { name: 'QA', description: 'Quality checks' };
    const { http, calls } = createHttpClient({ id: 'environment-1' });
    const service = new ProjectsService(http);
    service.createEnvironment('project-1', payload).subscribe();
    expect(calls).toEqual([{ method: 'POST', url: 'http://localhost:3000/projects/project-1/environments', body: payload, options: { withCredentials: true } }]);
  });

  it('deletes an environment with credentials', () => {
    const { http, calls } = createHttpClient(null);
    const service = new ProjectsService(http);
    service.deleteEnvironment('project-1', 'environment-1').subscribe();
    expect(calls).toEqual([{ method: 'DELETE', url: 'http://localhost:3000/projects/project-1/environments/environment-1', options: { withCredentials: true } }]);
  });
});
