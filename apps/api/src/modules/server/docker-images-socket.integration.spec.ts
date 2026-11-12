import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RuntimeImagesUnavailableError } from '@kiban/core';
import { dockerImageRequest, DockerImagesProvider } from '../service/providers/docker-images.provider';

let directory: string;
let socket: string;
let server: Server;
let malformed: boolean;
let tags: string[];
let present: boolean;
let calls: { method: string; path: string }[];
const id = `sha256:${'f'.repeat(64)}`;
beforeEach(async () => {
  // Short Unix socket path works on macOS as well as Linux.
  directory = mkdtempSync('/tmp/kiban-image-engine-');
  socket = join(directory, 'engine.sock');
  malformed = false;
  tags = ['example:old'];
  present = true;
  calls = [];
  server = createServer((request, response) => {
    calls.push({ method: request.method ?? '', path: request.url ?? '' });
    if (malformed) { response.end('not-json'); return; }
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'DELETE') {
      const target = decodeURIComponent((request.url ?? '').split('?')[0]?.slice('/images/'.length) ?? '');
      tags = target === id ? [] : tags.filter(tag => tag !== target);
      present = tags.length > 0;
      response.end(JSON.stringify([{ Untagged: target }]));
    } else if (request.url === '/images/json?all=true') {
      response.end(JSON.stringify(present ? [{ Id: id, RepoTags: tags, Size: 1024, Created: 123 }] : []));
    } else if (request.url?.startsWith('/images/') && request.url.endsWith('/json')) {
      response.end(JSON.stringify({ Id: id }));
    } else response.end('[]');
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  rmSync(directory, { recursive: true, force: true });
});

describe('Docker Engine socket image transport (simulated daemon only)', () => {
  it('sends read-all and non-forced single-image delete requests through a Unix socket', async () => {
    const provider = new DockerImagesProvider((method, path) => dockerImageRequest(method, path, socket), { listAll: async () => [] });
    expect((await provider.list())[0]).toMatchObject({ id, references: 0 });
    await provider.remove(id);
    expect(calls).toEqual([
      { method: 'GET', path: '/images/json?all=true' }, { method: 'GET', path: '/containers/json?all=true' },
      { method: 'GET', path: '/images/json?all=true' }, { method: 'GET', path: '/containers/json?all=true' },
      { method: 'DELETE', path: `/images/${id}?force=false&noprune=true` }
    ]);
  });

  it('removes slash-containing tags independently and preserves the other tag until selected', async () => {
    tags = ['timescale/timescaledb:2.31.0-pg16', 'timescale/timescaledb:latest-pg16'];
    const provider = new DockerImagesProvider((method, path) => dockerImageRequest(method, path, socket), { listAll: async () => [] });
    await provider.remove(id, 'timescale/timescaledb:latest-pg16');
    expect((await provider.list())[0]?.tags).toEqual(['timescale/timescaledb:2.31.0-pg16']);
    await provider.remove(id, 'timescale/timescaledb:2.31.0-pg16');
    expect(await provider.list()).toEqual([]);
    expect(calls.filter(call => call.method === 'DELETE').map(call => call.path)).toEqual([
      `/images/${encodeURIComponent('timescale/timescaledb:latest-pg16')}?force=false&noprune=true`,
      `/images/${encodeURIComponent('timescale/timescaledb:2.31.0-pg16')}?force=false&noprune=true`
    ]);
  });

  it('fails safely on malformed JSON or unavailable sockets, never issuing deletion', async () => {
    malformed = true;
    const provider = new DockerImagesProvider((method, path) => dockerImageRequest(method, path, socket), { listAll: async () => [] });
    await expect(provider.remove(id)).rejects.toBeInstanceOf(RuntimeImagesUnavailableError);
    expect(calls.every(call => call.method === 'GET')).toBe(true);
    const offline = new DockerImagesProvider((method, path) => dockerImageRequest(method, path, join(directory, 'missing.sock')), { listAll: async () => [] });
    await expect(offline.remove(id)).rejects.toBeInstanceOf(RuntimeImagesUnavailableError);
  });
});
