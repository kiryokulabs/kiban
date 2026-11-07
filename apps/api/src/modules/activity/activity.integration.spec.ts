import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { InstalledServiceManager, ProjectManager, type RuntimeProvider, type ServiceDefinition } from '@kiban/core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../../database/database.service';
import { configureHttpApplication } from '../../main';
import { AuthService } from '../auth/services/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SqliteProjectRepository } from '../project/repositories/sqlite-project.repository';
import { SqliteEnvironmentRepository } from '../project/repositories/sqlite-environment.repository';
import { SqliteProjectUnitOfWork } from '../project/repositories/sqlite-project-unit-of-work';
import { ProjectController } from '../project/controllers/project.controller';
import { ProjectService } from '../project/services/project.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { SqliteInstalledServiceRepository } from '../service/repositories/sqlite-installed-service.repository';
import { ServiceService } from '../service/services/service.service';
import { ServiceController } from '../service/controllers/service.controller';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { SqliteActivityRepository } from './sqlite-activity.repository';

let directory: string;
let database: DatabaseService;
let app: NestFastifyApplication;
let repository: SqliteActivityRepository;
let runtime: RuntimeProvider;
const actor = { id: 'operator-1', email: 'operator@example.com', role: 'operator' as const };
const headers = { cookie: 'kiban_session=operator', 'x-kiban-request': '1' };
const definition: ServiceDefinition = { id: 'redis', metadata: { id: 'redis', name: 'Redis', description: 'Cache', category: 'databases', author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [] }, composeYaml: '', runtime: { services: [] }, schema: {}, sourcePath: '/catalog/redis', icon: '<svg />' };

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'kiban-activity-'));
  database = new DatabaseService({ databasePath: join(directory, 'test.sqlite') });
  await database.onModuleInit();
  repository = new SqliteActivityRepository(database);
  const activity = new ActivityService(repository);
  const projects = new SqliteProjectRepository(database);
  const environments = new SqliteEnvironmentRepository(database);
  const catalog: Partial<CatalogService> = { listServiceDefinitions: vi.fn(async () => [definition]) };
  runtime = { install: vi.fn(async () => ({ status: 'running' as const })), redeploy: vi.fn(async () => ({ status: 'running' as const })), uninstall: vi.fn(async () => ({ status: 'stopped' as const })), start: vi.fn(async () => ({ status: 'running' as const })), stop: vi.fn(async () => ({ status: 'stopped' as const })), restart: vi.fn(async () => ({ status: 'running' as const })), health: vi.fn(async () => ({ status: 'healthy' as const })) };
  const services = new ServiceService(new InstalledServiceManager(new SqliteInstalledServiceRepository(database), environments, { listItems: async () => [definition], listCategories: async () => [] }, runtime), runtime, catalog as CatalogService, environments, projects, activity);
  const projectService = new ProjectService(new ProjectManager(projects, environments, new SqliteProjectUnitOfWork(database)), activity, services);
  const auth: Partial<AuthService> = { me: vi.fn(async () => ({ user: actor })) };
  Reflect.defineMetadata('design:paramtypes', [ProjectService], ProjectController);
  Reflect.defineMetadata('design:paramtypes', [ServiceService], ServiceController);
  Reflect.defineMetadata('design:paramtypes', [ActivityService], ActivityController);
  @Module({ controllers: [ProjectController, ServiceController, ActivityController], providers: [
    { provide: ProjectService, useValue: projectService }, { provide: ServiceService, useValue: services }, { provide: ActivityService, useValue: activity },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth as AuthService, new Reflector()) }
  ] }) class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  await configureHttpApplication(app);
  await app.init();
});
afterEach(async () => { if (app) await app.close(); rmSync(directory, { recursive: true, force: true }); });

async function createProject() {
  const response = await app.inject({ method: 'POST', url: '/api/projects', headers, payload: { name: 'Example', description: 'Not included in events' } });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: string; environments: { id: string }[] }>();
}

async function install(projectId: string, environmentId: string) {
  const response = await app.inject({ method: 'POST', url: `/api/projects/${projectId}/environments/${environmentId}/services`, headers, payload: { serviceId: 'redis', configuration: { PASSWORD: 'must-not-leak' } } });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: string }>();
}

describe('Real recent activity', () => {
  it('records project, environment and service actions once, with snapshots surviving deletion', async () => {
    const project = await createProject();
    expect(await database.get('SELECT COUNT(*) AS count FROM activity_events')).toEqual({ count: 1 });
    expect((await app.inject({ method: 'PATCH', url: `/api/projects/${project.id}`, headers, payload: { name: 'Renamed' } })).statusCode).toBe(200);
    const envResponse = await app.inject({ method: 'POST', url: `/api/projects/${project.id}/environments`, headers, payload: { name: 'QA' } });
    expect(envResponse.statusCode).toBe(201);
    const environment = envResponse.json<{ id: string }>();
    expect((await app.inject({ method: 'PATCH', url: `/api/projects/${project.id}/environments/${environment.id}`, headers, payload: { name: 'Preview' } })).statusCode).toBe(200);
    const service = await install(project.id, environment.id);
    for (const action of ['stop', 'start', 'restart', 'recreate']) expect((await app.inject({ method: 'PATCH', url: `/api/services/${service.id}/${action}`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: `/api/services/${service.id}/configuration`, headers, payload: { configuration: { PASSWORD: 'must-not-leak' } } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: `/api/services/${service.id}`, headers })).statusCode).toBe(204);
    expect((await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}/environments/${environment.id}`, headers })).statusCode).toBe(204);
    expect((await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}`, headers })).statusCode).toBe(204);
    const events = await repository.listRecent();
    expect(events).toHaveLength(5);
    expect(events.map(event => event.action)).toEqual(['project.deleted', 'environment.deleted', 'service.deleted', 'service.redeployed', 'service.redeployed']);
    expect(events.every(event => event.projectName === 'Renamed' && event.actorEmail === actor.email && event.actorId === actor.id)).toBe(true);
    expect(events.find(event => event.action === 'service.deleted')).toMatchObject({ resourceName: 'Redis', environmentName: 'Preview' });
    const all = await database.all<{ action: string }>('SELECT action FROM activity_events ORDER BY rowid');
    expect(all.map(event => event.action)).toEqual(['project.created', 'project.updated', 'environment.created', 'environment.updated', 'service.installed', 'service.stopped', 'service.started', 'service.restarted', 'service.redeployed', 'service.redeployed', 'service.deleted', 'environment.deleted', 'project.deleted']);
    expect(JSON.stringify(await database.all('SELECT * FROM activity_events'))).not.toMatch(/must-not-leak|configuration|token|description/i);
  });

  it('requires authentication, allows operators and always returns at most five persisted events', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/activity' })).statusCode).toBe(401);
    for (let i = 0; i < 7; i++) await createProject();
    const response = await app.inject({ method: 'GET', url: '/api/activity?limit=1000&actorEmail=attacker@example.com', headers });
    expect(response.statusCode).toBe(200);
    expect(response.json<unknown[]>()).toHaveLength(5);
    expect(response.body).not.toContain('attacker@example.com');
    const restarted = new SqliteActivityRepository(new DatabaseService({ databasePath: join(directory, 'test.sqlite') }));
    expect(await restarted.listRecent()).toHaveLength(5);
  });

  it('does not record failed/invalid operations, populated deletions or runtime failure states', async () => {
    const project = await createProject();
    const env = project.environments[0]!;
    const service = await install(project.id, env.id);
    const baseline = await database.get('SELECT COUNT(*) AS count FROM activity_events');
    expect((await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}`, headers })).statusCode).toBe(400);
    expect((await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}/environments/${env.id}`, headers })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/projects', headers, payload: { name: 'Fake', actorEmail: 'attacker@example.com' } })).statusCode).toBe(400);
    vi.mocked(runtime.restart).mockRejectedValueOnce(new Error('runtime failed'));
    expect((await app.inject({ method: 'PATCH', url: `/api/services/${service.id}/restart`, headers })).statusCode).toBe(500);
    vi.mocked(runtime.restart).mockResolvedValueOnce({ status: 'failed' });
    expect((await app.inject({ method: 'PATCH', url: `/api/services/${service.id}/restart`, headers })).statusCode).toBe(200);
    expect(await database.get('SELECT COUNT(*) AS count FROM activity_events')).toEqual(baseline);
  });

  it('does not report a failed installation as installed', async () => {
    const project = await createProject();
    vi.mocked(runtime.install).mockResolvedValueOnce({ status: 'failed' });
    await install(project.id, project.environments[0]!.id);
    expect((await repository.listRecent()).map(event => event.action)).toEqual(['project.created']);
  });

  it('keeps the completed operation successful when activity storage fails', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      vi.spyOn(repository, 'append').mockRejectedValueOnce(new Error('unavailable'));
      const project = await createProject();
      expect(await database.get('SELECT id FROM projects WHERE id = ?', [project.id])).toEqual({ id: project.id });
      expect(await repository.listRecent()).toEqual([]);
      expect(error).toHaveBeenCalledWith('Could not record project.created activity.');
    } finally { error.mockRestore(); }
  });

  it('reports unavailable history instead of fabricating an empty successful response', async () => {
    vi.spyOn(repository, 'listRecent').mockRejectedValueOnce(new Error('unavailable'));
    expect((await app.inject({ method: 'GET', url: '/api/activity', headers })).statusCode).toBe(500);
  });

  it('serves event history to operators in pages of 10 without changing the dashboard feed', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/activity/history' })).statusCode).toBe(401);
    const empty = await app.inject({ method: 'GET', url: '/api/activity/history', headers });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ items: [], page: 1, hasMore: false, total: 0 });
    await database.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<41) INSERT INTO activity_events (id,action,actor_id,actor_email,resource_id,resource_name,project_id,project_name,created_at) SELECT CAST(x AS TEXT),'project.created','actor','actor@example.com',CAST(x AS TEXT),'Project','p','Project',1 FROM n;");
    const pages: string[][] = [];
    for (const page of [1, 2, 3, 4, 5]) {
      const response = await app.inject({ method: 'GET', url: `/api/activity/history?page=${page}`, headers });
      expect(response.statusCode).toBe(200);
      const body = response.json<{ items: { id: string; createdAt: string }[]; page: number; hasMore: boolean; total: number }>();
      expect(body.items).toHaveLength(page === 5 ? 1 : 10);
      expect(body.page).toBe(page);
      expect(body.total).toBe(41);
      expect(body.hasMore).toBe(page < 5);
      expect(Date.parse(body.items[0]?.createdAt ?? '')).not.toBeNaN();
      pages.push(body.items.map(event => event.id));
    }
    expect(pages.flat()).toEqual(Array.from({ length: 41 }, (_, index) => String(41 - index)));
    expect((await app.inject({ method: 'GET', url: '/api/activity', headers })).json<unknown[]>()).toHaveLength(5);
    for (const value of ['0', '-1', '1.5', '101', 'abc', '1e2', '1%3BDROP%20TABLE%20activity_events']) {
      expect((await app.inject({ method: 'GET', url: `/api/activity/history?page=${value}`, headers })).statusCode).toBe(400);
    }
    expect((await app.inject({ method: 'GET', url: '/api/activity/history?page=1&page=2', headers })).statusCode).toBe(400);
    const lastPage = await app.inject({ method: 'GET', url: '/api/activity/history?page=100', headers });
    expect(lastPage.statusCode).toBe(200);
    expect(lastPage.json()).toEqual({ items: [], page: 100, hasMore: false, total: 41 });
    expect(await database.get('SELECT COUNT(*) AS count FROM activity_events')).toEqual({ count: 41 });
  });

  it('retains only the newest 1000 events, orders ties deterministically and adds just one table', async () => {
    const tables = await database.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'activity%'");
    expect(tables).toEqual([{ name: 'activity_events' }]);
    await database.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000) INSERT INTO activity_events (id,action,actor_id,actor_email,resource_id,resource_name,project_id,project_name,created_at) SELECT CAST(x AS TEXT),'project.created','actor','actor@example.com',CAST(x AS TEXT),'Old project','p','Old project',1 FROM n;");
    await repository.append({ action: 'project.created', actorId: actor.id, actorEmail: actor.email, resourceId: 'new', resourceName: 'New', projectId: 'new', projectName: 'New', environmentId: null, environmentName: null });
    expect(await database.get('SELECT COUNT(*) AS count FROM activity_events')).toEqual({ count: 1000 });
    expect((await repository.listRecent())[0]?.resourceId).toBe('new');
    expect((await repository.listRecent())[1]?.id).toBe('1000');
    const lastPage = await repository.listPage(100);
    expect(lastPage.items).toHaveLength(10);
    expect(lastPage.total).toBe(1000);
    expect(lastPage.hasMore).toBe(false);
    await database.onModuleInit();
    expect(await database.get('SELECT COUNT(*) AS count FROM activity_events')).toEqual({ count: 1000 });
  });
});
