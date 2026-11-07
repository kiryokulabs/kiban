import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityRepository } from '@kiban/core';
import { ActivityService } from './activity.service';

const actor = { id: 'operator-1', email: 'operator@example.com', role: 'operator' as const };
const context = { resourceId: 'p1', resourceName: 'Project', projectId: 'p1', projectName: 'Project', environmentId: null, environmentName: null };

describe('ActivityService', () => {
  it('records only explicit actor and resource metadata', async () => {
    const append = vi.fn(async () => undefined);
    const repository: ActivityRepository = { append, listRecent: vi.fn(async () => []), listPage: vi.fn(async () => ({ items: [], page: 1, hasMore: false, total: 0 })) };
    await new ActivityService(repository).record(actor, 'project.created', async () => context);
    expect(append).toHaveBeenCalledWith({ ...context, action: 'project.created', actorId: actor.id, actorEmail: actor.email });
  });

  it('logs auxiliary failures without turning completed operations into errors', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      const repository: ActivityRepository = { append: vi.fn(async () => { throw new Error('private storage details'); }), listRecent: vi.fn(async () => []), listPage: vi.fn(async () => ({ items: [], page: 1, hasMore: false, total: 0 })) };
      const service = new ActivityService(repository);
      await expect(service.record(actor, 'project.created', async () => context)).resolves.toBeUndefined();
      await expect(service.record(actor, 'project.created', async () => { throw new Error('context unavailable'); })).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(error.mock.calls)).not.toContain('private storage details');
    } finally { error.mockRestore(); }
  });
});
