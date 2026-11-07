import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { ActivityAction, ActivityContext, ActivityRepository, PublicUser } from '@kiban/core';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

/** Records successful operations without allowing auxiliary history failures to break them. */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  public constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository) {}

  public async record(actor: PublicUser, action: ActivityAction, context: () => Promise<ActivityContext>): Promise<void> {
    try {
      const snapshot = await context();
      await this.repository.append({ ...snapshot, action, actorId: actor.id, actorEmail: actor.email });
    } catch {
      this.logger.error(`Could not record ${action} activity.`);
    }
  }

  /** Keeps the dashboard summary fixed to the newest five events. */
  public async recent() {
    return (await this.repository.listRecent()).map(event => ({ ...event, createdAt: event.createdAt.toISOString() }));
  }

  /** Reads the retained history with a fixed page size and bounded numeric page parameter. */
  public async history(value: unknown) {
    const page = value === undefined ? 1 : typeof value === 'string' && /^[1-9]\d{0,2}$/.test(value) ? Number(value) : 0;
    if (page < 1 || page > 100) throw new BadRequestException('Page must be an integer from 1 to 100.');
    const result = await this.repository.listPage(page);
    return { ...result, items: result.items.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })) };
  }

}
