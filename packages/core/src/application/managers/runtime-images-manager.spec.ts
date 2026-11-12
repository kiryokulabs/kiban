import { describe, expect, it, vi } from 'vitest';
import { ForbiddenUserActionError } from '../../domain/users/user-errors.js';
import { RuntimeImageValidationError } from '../../domain/runtime/runtime-image.js';
import { RuntimeImagesManager } from './runtime-images-manager.js';

const admin = { id: 'admin', email: 'admin@example.com', role: 'admin' as const };
const operator = { ...admin, id: 'operator', role: 'operator' as const };

describe('RuntimeImagesManager', () => {
  it('allows listing and delegates deletion only for administrators', async () => {
    const provider = { list: vi.fn(async () => []), remove: vi.fn(async () => undefined) };
    const manager = new RuntimeImagesManager(provider);
    await expect(manager.list()).resolves.toEqual([]);
    await expect(manager.remove(operator, 'image-id')).rejects.toBeInstanceOf(ForbiddenUserActionError);
    expect(provider.remove).not.toHaveBeenCalled();
    await manager.remove(admin, 'image-id');
    expect(provider.remove).toHaveBeenCalledWith('image-id');
  });

  it.each(['', ' ', 'x'.repeat(257)])('rejects malformed identifiers before contacting the runtime', async id => {
    const provider = { list: vi.fn(async () => []), remove: vi.fn(async () => undefined) };
    await expect(new RuntimeImagesManager(provider).remove(admin, id)).rejects.toBeInstanceOf(RuntimeImageValidationError);
    expect(provider.remove).not.toHaveBeenCalled();
  });

  it.each([null, [], 123, '', 'x'.repeat(513), 'tag\nInjected'])('rejects malformed tag selectors before contacting the runtime', async tag => {
    const provider = { list: vi.fn(async () => []), remove: vi.fn(async () => undefined) };
    await expect(new RuntimeImagesManager(provider).remove(admin, 'image-id', tag)).rejects.toBeInstanceOf(RuntimeImageValidationError);
    expect(provider.remove).not.toHaveBeenCalled();
  });

});
