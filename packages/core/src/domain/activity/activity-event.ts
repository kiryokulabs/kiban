/** Successful user-triggered operations shown in the shared dashboard feed. */
export type ActivityAction =
  | 'project.created' | 'project.updated' | 'project.deleted'
  | 'environment.created' | 'environment.updated' | 'environment.deleted'
  | 'service.installed' | 'service.started' | 'service.stopped'
  | 'service.restarted' | 'service.redeployed' | 'service.deleted';

/** Snapshot of display metadata; survives resource renaming/deletion and contains no configuration. */
export interface ActivityContext {
  readonly resourceId: string;
  readonly resourceName: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly environmentId: string | null;
  readonly environmentName: string | null;
}

export interface ActivityInput extends ActivityContext {
  readonly action: ActivityAction;
  readonly actorId: string;
  readonly actorEmail: string;
}

export interface ActivityEvent extends ActivityInput {
  readonly id: string;
  readonly createdAt: Date;
}

/** Fixed-size history page; the dashboard remains a separate five-event summary. */
export interface ActivityPage {
  /** Current number of retained events across all pages. */
  readonly total: number;
  readonly items: readonly ActivityEvent[];
  readonly page: number;
  readonly hasMore: boolean;
}
