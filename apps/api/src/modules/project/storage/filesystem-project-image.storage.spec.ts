import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

    await storage.save('d102f7bd-a624-4e65-8110-4bd0ca560211', { contentType: 'image/png', data: Buffer.from('image') });

    await expect(storage.find('d102f7bd-a624-4e65-8110-4bd0ca560211')).resolves.toEqual({ contentType: 'image/png', data: Buffer.from('image') });
  });

  it('replaces the previous image when a new type is saved', async () => {
    const storage = await createStorage();

    await storage.save('d102f7bd-a624-4e65-8110-4bd0ca560211', { contentType: 'image/png', data: Buffer.from('old') });
    await storage.save('d102f7bd-a624-4e65-8110-4bd0ca560211', { contentType: 'image/webp', data: Buffer.from('new') });

    await expect(storage.find('d102f7bd-a624-4e65-8110-4bd0ca560211')).resolves.toEqual({ contentType: 'image/webp', data: Buffer.from('new') });
  });

  it('returns null when the project has no image', async () => {
    const storage = await createStorage();

    await expect(storage.find('d102f7bd-a624-4e65-8110-4bd0ca560212')).resolves.toBeNull();
  });


  it('stores images under the UUID project directory', async () => {
    const storage = await createStorage();
    if (!rootPath) throw new Error('Missing test root path');

    await storage.save('d102f7bd-a624-4e65-8110-4bd0ca560211', { contentType: 'image/png', data: Buffer.from('safe') });

    await expect(readFile(join(rootPath, 'd102f7bd-a624-4e65-8110-4bd0ca560211', 'assets', 'image.png'))).resolves.toEqual(Buffer.from('safe'));
  });



  it('removes the project image directory when deleting project image storage', async () => {
    const storage = await createStorage();
    if (!rootPath) throw new Error('Missing test root path');

    await storage.save('d102f7bd-a624-4e65-8110-4bd0ca560211', { contentType: 'image/png', data: Buffer.from('safe') });
    await storage.delete('d102f7bd-a624-4e65-8110-4bd0ca560211');

    await expect(readFile(join(rootPath, 'd102f7bd-a624-4e65-8110-4bd0ca560211', 'assets', 'image.png'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(rootPath, 'd102f7bd-a624-4e65-8110-4bd0ca560211'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects project ids that could escape the project image root', async () => {
    const storage = await createStorage();
    if (!rootPath) throw new Error('Missing test root path');

    const escapedPath = join(rootPath, '..', 'outside-project', 'assets', 'image.png');
    await rm(join(rootPath, '..', 'outside-project'), { recursive: true, force: true });

    await expect(storage.save('../outside-project', { contentType: 'image/png', data: Buffer.from('safe') })).rejects.toThrow('Invalid project id');
    await expect(readFile(escapedPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
