import '@angular/compiler';
import { HttpClient, HttpResponse, type HttpBackend, type HttpRequest } from '@angular/common/http';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../shared/toast.service';
import { ServerImagesPageComponent } from '../pages/server-images-page.component';
import { ServerImagesApiService } from './server-images-api.service';
import type { ServerImageRow } from './server-images.models';

vi.mock('../shared/icons.component', () => ({ IconsComponent: class {} }));
vi.mock('../activity/events-header.component', () => ({ EventsHeaderComponent: class {} }));
vi.mock('../shared/confirm-modal.component', () => ({ ConfirmModalComponent: class {} }));
const image: ServerImageRow = { id: `sha256:${'a'.repeat(64)}`, tags: ['redis:7'], tag: 'redis:7', sizeBytes: 1024, references: 0, isKibanCore: false, services: [], createdAt: '2026-11-09T10:00:00Z' };
class TestImagesPage extends ServerImagesPageComponent {
  public get rows() { return this.images(); }
  public get pendingImage() { return this.pendingDelete(); }
  public get failed() { return this.error(); }
  public get busy() { return this.deleting(); }
  public ask(item: ServerImageRow): void { this.requestDelete(item); }
  public confirm(): void { this.confirmDelete(); }
  public refresh(): void { this.loadImages(); }
}
const createPage = (role: 'admin' | 'operator' = 'admin') => {
  const api = { list: vi.fn(() => of([image])), remove: vi.fn(() => of(undefined)) };
  const toast = { success: vi.fn(), error: vi.fn() };
  const injector = Injector.create({ providers: [
    { provide: ServerImagesApiService, useValue: api },
    { provide: AuthService, useValue: { user: signal({ id: role, email: `${role}@example.com`, role }) } },
    { provide: ToastService, useValue: toast }
  ] });
  return { page: runInInjectionContext(injector, () => new TestImagesPage()), api, toast };
};

describe('Server image cleanup UI', () => {
  it('requires admin permission, an unused image and explicit confirmation before deletion', () => {
    const { page, api } = createPage();
    expect(page.rows).toEqual([image]);
    page.ask({ ...image, references: 1 });
    expect(page.pendingImage).toBeNull();
    page.confirm();
    expect(api.remove).not.toHaveBeenCalled();
    page.ask(image);
    expect(page.pendingImage).toEqual(image);
    expect(api.remove).not.toHaveBeenCalled();
    page.confirm();
    expect(api.remove).toHaveBeenCalledWith(image.id, image.tag);
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('shows separate rows for each tag sharing the same image ID and deletes only the chosen tag', () => {
    const { page, api } = createPage();
    api.list.mockReturnValueOnce(of([{ ...image, tags: ['redis:7', 'redis:latest'] }]));
    page.refresh();
    expect(page.rows.map(row => [row.id, row.tag])).toEqual([[image.id, 'redis:7'], [image.id, 'redis:latest']]);
    const latest = page.rows[1];
    expect(latest).toBeDefined();
    if (!latest) throw new Error('Missing tag row');
    page.ask(latest);
    page.confirm();
    expect(api.remove).toHaveBeenCalledWith(image.id, 'redis:latest');
  });

  it('shows associated Kiban services on each tag row and leaves unknown service cells empty', () => {
    const { page, api } = createPage();
    const services = [{ id: 'service-1', name: 'WordPress' }];
    api.list.mockReturnValueOnce(of([{ ...image, references: 1, services, tags: ['postgres:16', 'postgres:latest'] }]));
    page.refresh();
    expect(page.rows.map(row => row.services)).toEqual([services, services]);
    const source = readFileSync(resolve(process.cwd(), 'src/app/pages/server-images-page.component.ts'), 'utf8');
    expect(source).toContain('>Service</th>');
    expect(source).toContain('@for (service of image.services; track service.id)');
    expect(source).toContain('{{ service.name }}');
  });

  it('labels core images alongside shared installed services and prevents deletion', () => {
    const { page, api } = createPage();
    const core = { ...image, isKibanCore: true, services: [{ id: 'proxy', name: 'My Traefik' }] };
    api.list.mockReturnValueOnce(of([core]));
    page.refresh();
    expect(page.rows[0]).toMatchObject(core);
    page.ask(core);
    page.confirm();
    expect(page.pendingImage).toBeNull();
    expect(api.remove).not.toHaveBeenCalled();
    const source = readFileSync(resolve(process.cwd(), 'src/app/pages/server-images-page.component.ts'), 'utf8');
    expect(source).toContain('@if (image.isKibanCore)');
    expect(source).toContain('KibanOS');
    expect(source).toContain('Core</span>');
    expect(source).toContain('Required by KibanOS. Removing this image may prevent KibanOS from starting.');
    expect(source).toContain('[disabled]="image.isKibanCore || image.references > 0');
  });

  it('allows operators to see images but never to request or execute deletion', () => {
    const { page, api } = createPage('operator');
    expect(page.rows).toEqual([image]);
    page.ask(image);
    page.confirm();
    expect(page.pendingImage).toBeNull();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('keeps the image on deletion failure and does not show a false success', () => {
    const { page, api, toast } = createPage();
    api.remove.mockImplementationOnce(() => throwError(() => new Error('conflict')));
    page.ask(image);
    page.confirm();
    expect(page.rows).toEqual([image]);
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('prevents duplicate deletion and shows unavailable lists as errors, not empty success', () => {
    const { page, api } = createPage();
    const pending = new Subject<undefined>();
    api.remove.mockImplementationOnce(() => pending);
    page.ask(image);
    page.confirm();
    page.confirm();
    expect(api.remove).toHaveBeenCalledTimes(1);
    pending.next(undefined);
    pending.complete();
    api.list.mockImplementationOnce(() => throwError(() => new Error('offline')));
    page.refresh();
    expect(page.failed).toBeTruthy();
  });

  it('uses authenticated API calls with encoded IDs and no force option', () => {
    const requests: HttpRequest<unknown>[] = [];
    const backend: HttpBackend = { handle: request => { requests.push(request); return of(new HttpResponse({ body: [] })); } };
    const api = new ServerImagesApiService(new HttpClient(backend));
    api.list().subscribe();
    api.remove(image.id, image.tag ?? undefined).subscribe();
    expect(requests[1]?.params.get('tag')).toBe(image.tag);
    expect(requests.map(request => [request.method, request.url, request.withCredentials])).toEqual([
      ['GET', '/api/server/images', true], ['DELETE', `/api/server/images/${encodeURIComponent(image.id)}`, true]
    ]);
  });

  it('groups images under Server without redirecting the old Events root', () => {
    const read = (file: string) => readFileSync(resolve(process.cwd(), 'src/app', file), 'utf8');
    expect(read('app.component.ts')).toContain("{ label: 'Server', path: '/server', icon: 'logs' }");
    const routes = read('app.routes.ts');
    for (const path of ['server', 'server/logs', 'server/images']) expect(routes).toContain(`path: '${path}'`);
    expect(routes).not.toContain("path: 'events',");
    expect(routes).toContain("{ path: 'events/logs', redirectTo: 'server/logs', pathMatch: 'full' }");
    expect(read('activity/events-header.component.ts')).toContain('Docker Images');
    expect(read('pages/server-images-page.component.ts')).toContain('<kiban-events-header active="images" />');
  });
});
