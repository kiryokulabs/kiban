import type { ActivityEvent, ActivityInput, ActivityPage } from '../../domain/activity/activity-event.js';

/** Auxiliary operational history; implementations retain a bounded number of snapshots. */
export interface ActivityRepository {
  append(event: ActivityInput): Promise<void>;
  /** Returns the newest five events, newest first. */
  listRecent(): Promise<readonly ActivityEvent[]>;
  /** Returns a page of 10 retained events; page is validated by the application. */
  listPage(page: number): Promise<ActivityPage>;
}
