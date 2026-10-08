import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { FilesystemProjectImageStorage } from './filesystem-project-image.storage';

let rootPath: string | null = null;

const createStorage = async (): Promise<FilesystemProjectImageStorage> => {
  rootPath = await mkdtemp(join(tmpdir(), 'kiban-project-images-'));
  return new FilesystemProjectImageStorage(rootPath);
};

afterEach(async () => {
  if (rootPath) await rm(rootPath, { recursive: true, force: true });
  rootPath = null;
});

describe('FilesystemProjectImageStorage', () => {
  it('stores and reads a project image from project assets', async () => {
    const storage = await createStorage();

    await storage.save('project-1', { contentType: 'image/png', data: Buffer.from('image') });

    await expect(storage.find('project-1')).resolves.toEqual({ contentType: 'image/png', data: Buffer.from('image') });
  });

  it('replaces the previous image when a new type is saved', async () => {
    const storage = await createStorage();

    await storage.save('project-1', { contentType: 'image/png', data: Buffer.from('old') });
    await storage.save('project-1', { contentType: 'image/webp', data: Buffer.from('new') });

    await expect(storage.find('project-1')).resolves.toEqual({ contentType: 'image/webp', data: Buffer.from('new') });
  });

  it('returns null when the project has no image', async () => {
    const storage = await createStorage();

    await expect(storage.find('missing')).resolves.toBeNull();
  });
});
