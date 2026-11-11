import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { RuntimeImagesManager, type InstalledService, type RuntimeImage, UnauthenticatedError } from '@kiban/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttpApplication } from '../../main';
import { AuthService } from '../auth/services/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { DockerImagesProvider, type DockerImageRequest } from '../service/providers/docker-images.provider';
import { ServerImagesController } from './server-images.controller';
import { ServerImagesService } from './server-images.service';

let app: NestFastifyApplication;
let referenced: boolean;
let serviceRows: InstalledService[];
let composeProject: string;
let composeService: string;
let request: ReturnType<typeof vi.fn<DockerImageRequest>>;
const id = `sha256:${'c'.repeat(64)}`;
const adminHeaders = { cookie: 'kiban_session=admin', 'x-kiban-request': '1' };

beforeEach(async () => {
  referenced = false;
  serviceRows = [];
  composeProject = 'unknown';
  composeService = 'unknown';
  request = vi.fn<DockerImageRequest>(async (method, path) => {
    if (path.endsWith('/json') && path.startsWith('/images/')) return { statusCode: 200, body: { Id: id } };
    if (method === 'DELETE') return { statusCode: 200, body: [] };
    return { statusCode: 200, body: path.startsWith('/images/') ? [{ Id: id, RepoTags: ['ghcr.io/kiryokulabs/kiban-api:old'], Size: 123, Created: 123 }] : referenced ? [{ ImageID: id, State: 'exited', Labels: { 'com.docker.compose.project': composeProject, 'com.docker.compose.service': composeService } }] : [] };
  });
  const images = new ServerImagesService(new RuntimeImagesManager(new DockerImagesProvider(request, { listAll: async () => serviceRows })));
  const auth: Partial<AuthService> = { me: vi.fn(async token => {
    if (token !== 'admin' && token !== 'operator') throw new UnauthenticatedError();
    return { user: { id: token, email: `${token}@example.com`, role: token } };
  }) };
  Reflect.defineMetadata('design:paramtypes', [ServerImagesService], ServerImagesController);
  @Module({ controllers: [ServerImagesController], providers: [
    { provide: ServerImagesService, useValue: images },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth as AuthService, new Reflector()) }
  ] }) class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  await configureHttpApplication(app);
  await app.init();
});
afterEach(async () => { await app.close(); });

describe('Server image HTTP permissions and safety', () => {
  it('rejects anonymous access and permits authenticated operator reads', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/server/images' })).statusCode).toBe(401);
    const response = await app.inject({ method: 'GET', url: '/api/server/images', headers: { cookie: 'kiban_session=operator' } });
    expect(response.statusCode).toBe(200);
    expect(response.json<RuntimeImage[]>()[0]).toMatchObject({ id, references: 0, sizeBytes: 123 });
  });

  it('returns only known service IDs/names for the image, leaving unknown associations empty', async () => {
    referenced = true;
    composeProject = 'real-deployment';
    serviceRows = [{ id: 'service-1', name: 'My PostgreSQL', serviceId: 'postgres', environmentId: 'env', status: 'stopped', configuration: { PASSWORD: 'must-not-leak' }, runtime: { provider: 'docker-compose', projectName: composeProject }, createdAt: new Date(), updatedAt: new Date() }];
    const response = await app.inject({ method: 'GET', url: '/api/server/images', headers: adminHeaders });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ services: { id: string; name: string }[] }[]>()[0]?.services).toEqual([{ id: 'service-1', name: 'My PostgreSQL' }]);
    expect(response.body).not.toMatch(/must-not-leak|projectName|configuration/);
    composeProject = 'external';
    const unknown = await app.inject({ method: 'GET', url: '/api/server/images', headers: adminHeaders });
    expect(unknown.json<{ services: unknown[] }[]>()[0]?.services).toEqual([]);
  });

  it('exposes core status and refuses admin deletion even with forged client flags', async () => {
    referenced = true;
    composeProject = 'kiban';
    composeService = 'kiban-api';
    const listed = await app.inject({ method: 'GET', url: '/api/server/images', headers: { cookie: 'kiban_session=operator' } });
    expect(listed.json<RuntimeImage[]>()[0]).toMatchObject({ id, isKibanCore: true });
    const deleted = await app.inject({ method: 'DELETE', url: `/api/server/images/${id}?isKibanCore=false&force=true`, headers: adminHeaders });
    expect(deleted.statusCode).toBe(409);
    expect(deleted.body).toContain('Required by KibanOS');
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('rejects operator deletion and forged role claims before contacting Docker', async () => {
    const response = await app.inject({ method: 'DELETE', url: `/api/server/images/${id}?role=admin&force=true`, headers: { ...adminHeaders, cookie: 'kiban_session=operator' } });
    expect(response.statusCode).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });

  it('requires the existing CSRF header and returns controlled validation/not-found errors', async () => {
    expect((await app.inject({ method: 'DELETE', url: `/api/server/images/${id}`, headers: { cookie: adminHeaders.cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: '/api/server/images/redis:latest', headers: adminHeaders })).statusCode).toBe(400);
    expect((await app.inject({ method: 'DELETE', url: `/api/server/images/sha256:${'d'.repeat(64)}`, headers: adminHeaders })).statusCode).toBe(404);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('rechecks usage on each delete and never removes a referenced image', async () => {
    await app.inject({ method: 'GET', url: '/api/server/images', headers: adminHeaders });
    referenced = true;
    expect((await app.inject({ method: 'DELETE', url: `/api/server/images/${id}`, headers: adminHeaders })).statusCode).toBe(409);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('passes only a validated selected tag to non-forced deletion', async () => {
    const tag = 'ghcr.io/kiryokulabs/kiban-api:old';
    const response = await app.inject({ method: 'DELETE', url: `/api/server/images/${id}?tag=${encodeURIComponent(tag)}`, headers: adminHeaders });
    expect(response.statusCode).toBe(204);
    expect(request).toHaveBeenLastCalledWith('DELETE', `/images/${encodeURIComponent(tag)}?force=false&noprune=true`);
    const malformed = await app.inject({ method: 'DELETE', url: `/api/server/images/${id}?tag=a&tag=b`, headers: adminHeaders });
    expect(malformed.statusCode).toBe(400);
  });

  it('allows explicit admin deletion without force or touching other resource types', async () => {
    const response = await app.inject({ method: 'DELETE', url: `/api/server/images/${id}?force=true`, headers: adminHeaders });
    expect(response.statusCode).toBe(204);
    expect(request).toHaveBeenLastCalledWith('DELETE', `/images/${id}?force=false&noprune=true`);
    expect(request.mock.calls.every(([, path]) => path.startsWith('/images/') || path === '/containers/json?all=true')).toBe(true);
  });
});
