import { describe, expect, it, vi } from 'vitest';
import { type InstalledService, RuntimeImageConflictError, RuntimeImageInUseError, RuntimeImageNotFoundError, RuntimeImageValidationError, RuntimeImagesUnavailableError } from '@kiban/core';
import { DockerImagesProvider, type DockerImageRequest } from '../service/providers/docker-images.provider';

const id = `sha256:${'a'.repeat(64)}`;
const other = `sha256:${'b'.repeat(64)}`;
const image = { Id: id, RepoTags: ['redis:7'], Created: 1_700_000_000, Size: 123456 };
const setup = () => {
  const state: { containers: unknown; images: unknown; deleteStatus: number; resolvedId: string; services: InstalledService[] } = { containers: [], images: [image], deleteStatus: 200, resolvedId: id, services: [] };
  const request = vi.fn<DockerImageRequest>(async (method, path) => {
    if (method === 'DELETE') return { statusCode: state.deleteStatus, body: [] };
    if (path.endsWith('/json') && path.startsWith('/images/')) return { statusCode: 200, body: { Id: state.resolvedId } };
    if (path === '/images/json?all=true') return { statusCode: 200, body: state.images };
    if (path === '/containers/json?all=true') return { statusCode: 200, body: state.containers };
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  return { state, request, provider: new DockerImagesProvider(request, { listAll: async () => state.services }) };
};

describe('Docker image cleanup safety', () => {
  it('lists all server images, including dangling images and references from stopped/external containers', async () => {
    const { state, provider } = setup();
    state.images = [image, { ...image, Id: other, RepoTags: null }];
    state.containers = [{ ImageID: id, State: 'running', Labels: { 'com.docker.compose.project': 'kiban' } }, { ImageID: id, State: 'exited', Labels: { 'com.docker.compose.project': 'external' } }];
    expect(await provider.list()).toEqual([
      { id, tags: ['redis:7'], sizeBytes: image.Size, createdAt: new Date(image.Created * 1000), references: 2, isKibanCore: false, services: [] },
      { id: other, tags: [], sizeBytes: image.Size, createdAt: new Date(image.Created * 1000), references: 0, isKibanCore: false, services: [] }
    ]);
  });

  it.each([['kiban', 'kiban-api'], ['kiban', 'kiban-web'], ['kiban-traefik', 'traefik']])('marks the actual %s/%s image as core and blocks deletion of every tag', async (project, service) => {
    const { state, request, provider } = setup();
    state.images = [{ ...image, RepoTags: ['custom:current', 'custom:alias'] }, { ...image, Id: other, RepoTags: ['ghcr.io/kiryokulabs/kiban-api:old'] }];
    state.containers = [{ ImageID: id, State: 'exited', Labels: { 'com.docker.compose.project': project, 'com.docker.compose.service': service } }];
    expect(await provider.list()).toEqual([
      expect.objectContaining({ id, isKibanCore: true }),
      expect.objectContaining({ id: other, isKibanCore: false })
    ]);
    for (const tag of [undefined, 'custom:current', 'custom:alias']) {
      await expect(provider.remove(id, tag)).rejects.toThrow('Required by KibanOS');
    }
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
    await provider.remove(other);
    expect(request).toHaveBeenLastCalledWith('DELETE', `/images/${other}?force=false&noprune=true`);
  });

  it.each([['user-traefik', 'traefik'], ['kiban', 'other'], ['external', 'kiban-api'], ['kiban-traefik', 'other'], ['kiban', undefined]])('does not classify unrelated %s/%s containers as core', async (project, service) => {
    const { state, provider } = setup();
    state.images = [{ ...image, RepoTags: ['traefik:v3.6'] }];
    state.containers = [{ ImageID: id, Labels: { 'com.docker.compose.project': project, 'com.docker.compose.service': service } }];
    expect((await provider.list())[0]).toMatchObject({ isKibanCore: false, references: 1 });
  });

  it('retains installed service names when they share the core Traefik image ID', async () => {
    const { state, provider } = setup();
    state.services = [{ id: 'user-proxy', name: 'My Traefik', environmentId: 'env', serviceId: 'traefik', status: 'running', configuration: {}, runtime: { provider: 'docker-compose', projectName: 'user-traefik' }, createdAt: new Date(), updatedAt: new Date() }];
    state.containers = [
      { ImageID: id, Labels: { 'com.docker.compose.project': 'kiban-traefik', 'com.docker.compose.service': 'traefik' } },
      { ImageID: id, Labels: { 'com.docker.compose.project': 'user-traefik', 'com.docker.compose.service': 'traefik' } }
    ];
    expect((await provider.list())[0]).toMatchObject({ isKibanCore: true, references: 2, services: [{ id: 'user-proxy', name: 'My Traefik' }] });
  });

  it('associates real image references with installed services, deduplicating multiple containers and ignoring unrelated names', async () => {
    const { state, provider } = setup();
    const service = (id: string, name: string, projectName: string): InstalledService => ({ id, name, environmentId: 'env', serviceId: 'catalog-entry', status: 'running', configuration: { PASSWORD: 'must-not-leak' }, runtime: { provider: 'docker-compose', projectName, workingDirectory: '/private/runtime/path' }, createdAt: new Date(), updatedAt: new Date() });
    state.services = [service('wordpress', 'WordPress', 'deployment-one'), service('ghost', 'Ghost', 'deployment-two')];
    state.images = [image, { ...image, Id: other }];
    state.containers = [
      { ImageID: id, Labels: { 'com.docker.compose.project': 'deployment-one' } },
      { ImageID: id, Labels: { 'com.docker.compose.project': 'deployment-one' } },
      { ImageID: id, State: 'exited', Labels: { 'com.docker.compose.project': 'deployment-two' } },
      { ImageID: id, Labels: { 'com.docker.compose.project': 'external' } }
    ];
    const rows = await provider.list();
    expect(rows[0]).toMatchObject({ references: 4, services: [{ id: 'wordpress', name: 'WordPress' }, { id: 'ghost', name: 'Ghost' }] });
    expect(rows[1]).toMatchObject({ references: 0, isKibanCore: false, services: [] });
    expect(JSON.stringify(rows)).not.toMatch(/must-not-leak|workingDirectory|deployment-one|external/);
  });

  it.each(['running', 'exited', 'created', 'paused', 'dead'])('never deletes an image referenced by a %s container', async State => {
    const { state, request, provider } = setup();
    state.containers = [{ ImageID: id, State }];
    await expect(provider.remove(id)).rejects.toBeInstanceOf(RuntimeImageInUseError);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('rechecks references after a stale unused listing and does not trust the client state', async () => {
    const { state, request, provider } = setup();
    expect((await provider.list())[0]?.references).toBe(0);
    state.containers = [{ ImageID: id, State: 'exited' }];
    await expect(provider.remove(id)).rejects.toBeInstanceOf(RuntimeImageInUseError);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('deletes only the full selected image ID, without force or parent pruning', async () => {
    const { request, provider } = setup();
    await provider.remove(id);
    expect(request).toHaveBeenLastCalledWith('DELETE', `/images/${id}?force=false&noprune=true`);
  });

  it.each(['redis:latest', 'abc', '../containers/other', `${id}?force=true`, `sha256:${'a'.repeat(12)}`])('rejects unsafe or ambiguous image ID %s', async value => {
    const { request, provider } = setup();
    await expect(provider.remove(value)).rejects.toBeInstanceOf(RuntimeImageValidationError);
    expect(request).not.toHaveBeenCalled();
  });

  it('removes only the selected tag when multiple tags point to one image ID', async () => {
    const { state, request, provider } = setup();
    state.images = [{ ...image, RepoTags: ['timescale/timescaledb:2.31.0-pg16', 'timescale/timescaledb:latest-pg16'] }];
    const tag = 'timescale/timescaledb:latest-pg16';
    await provider.remove(id, tag);
    expect(request).toHaveBeenLastCalledWith('DELETE', `/images/${encodeURIComponent(tag)}?force=false&noprune=true`);
    expect(request.mock.calls.filter(([method]) => method === 'DELETE')).toHaveLength(1);
  });

  it('rejects a missing/reassigned tag and never substitutes another image', async () => {
    const { state, request, provider } = setup();
    await expect(provider.remove(id, 'other:tag')).rejects.toBeInstanceOf(RuntimeImageConflictError);
    state.resolvedId = other;
    await expect(provider.remove(id, 'redis:7')).rejects.toBeInstanceOf(RuntimeImageConflictError);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('rechecks all container references after resolving a tag before attempting removal', async () => {
    const { state, request, provider } = setup();
    request.mockImplementation(async (method, path) => {
      if (path === '/images/json?all=true') return { statusCode: 200, body: state.images };
      if (path.endsWith('/json')) { state.containers = [{ ImageID: id, State: 'exited' }]; return { statusCode: 200, body: { Id: id } }; }
      if (path === '/containers/json?all=true') return { statusCode: 200, body: state.containers };
      throw new Error(`Unexpected ${method}`);
    });
    await expect(provider.remove(id, 'redis:7')).rejects.toBeInstanceOf(RuntimeImageInUseError);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('reports missing images and Docker conflicts without trying force deletion', async () => {
    const { state, request, provider } = setup();
    await expect(provider.remove(other)).rejects.toBeInstanceOf(RuntimeImageNotFoundError);
    state.deleteStatus = 409;
    await expect(provider.remove(id)).rejects.toBeInstanceOf(RuntimeImageConflictError);
    expect(request.mock.calls.filter(([method]) => method === 'DELETE')).toHaveLength(1);
  });

  it.each([null, {}, [{ ImageID: null }], [{ State: 'exited' }]])('fails closed when container references cannot be determined', async containers => {
    const { state, request, provider } = setup();
    state.containers = containers;
    await expect(provider.remove(id)).rejects.toBeInstanceOf(RuntimeImagesUnavailableError);
    expect(request.mock.calls.some(([method]) => method === 'DELETE')).toBe(false);
  });

  it('surfaces unavailable Docker instead of pretending all images are unused', async () => {
    const request: DockerImageRequest = vi.fn(async () => { throw new Error('private socket failure'); });
    const provider = new DockerImagesProvider(request, { listAll: async () => [] });
    await expect(provider.list()).rejects.toBeInstanceOf(RuntimeImagesUnavailableError);
    await expect(provider.remove(id)).rejects.not.toThrow('private socket failure');
  });
});
