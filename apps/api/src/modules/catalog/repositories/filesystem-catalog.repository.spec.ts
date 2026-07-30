import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FilesystemCatalogRepository } from './filesystem-catalog.repository';

const writeService = (root: string, category: string, service: string, name: string): void => {
  const dir = join(root, category, service);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({ id: service, name, description: `${name} service`, version: '1.0.0', author: 'Kiban', category, minimumVersion: '0.1.0' }));
  writeFileSync(join(dir, 'compose.yaml'), `services:\n  ${service}:\n    image: ${service}:latest\n`);
  writeFileSync(join(dir, 'schema.json'), JSON.stringify({ type: 'object', properties: {} }));
  writeFileSync(join(dir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>');
};

describe('FilesystemCatalogRepository', () => {
  it('recursively discovers valid service definitions without registration code', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-catalog-'));
    writeService(root, 'databases', 'postgresql', 'PostgreSQL');
    writeService(root, 'messaging', 'nats', 'NATS');

    const repository = FilesystemCatalogRepository.fromRoot(root);

    await expect(repository.listItems()).resolves.toMatchObject([
      { id: 'postgresql', name: 'PostgreSQL', category: { id: 'databases' } },
      { id: 'nats', name: 'NATS', category: { id: 'messaging' } }
    ]);
  });

  it('builds categories only from discovered service folders', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-catalog-'));
    writeService(root, 'storage', 'minio', 'MinIO');

    const repository = FilesystemCatalogRepository.fromRoot(root);

    await expect(repository.listCategories()).resolves.toEqual([{ id: 'storage', name: 'Storage', description: 'Storage services' }]);
  });

  it('ignores incomplete service folders', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kiban-catalog-'));
    mkdirSync(join(root, 'databases', 'broken'), { recursive: true });
    writeFileSync(join(root, 'databases', 'broken', 'metadata.json'), JSON.stringify({ id: 'broken', name: 'Broken', description: 'Broken', version: '1.0.0', author: 'Kiban', category: 'databases', minimumVersion: '0.1.0' }));

    const repository = FilesystemCatalogRepository.fromRoot(root);

    await expect(repository.listItems()).resolves.toEqual([]);
  });
});
