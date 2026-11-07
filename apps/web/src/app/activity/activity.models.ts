import type { KibanIcon } from '../shared/icons.component';

export const ACTIVITY_PRESENTATION = {
  'project.created': { verb: 'created', icon: 'projects' },
  'project.updated': { verb: 'updated', icon: 'edit' },
  'project.deleted': { verb: 'deleted', icon: 'trash' },
  'environment.created': { verb: 'created', icon: 'server' },
  'environment.updated': { verb: 'updated', icon: 'edit' },
  'environment.deleted': { verb: 'deleted', icon: 'trash' },
  'service.installed': { verb: 'installed', icon: 'installed' },
  'service.started': { verb: 'started', icon: 'play' },
  'service.stopped': { verb: 'stopped', icon: 'stop' },
  'service.restarted': { verb: 'restarted', icon: 'restart' },
  'service.redeployed': { verb: 'redeployed', icon: 'refresh' },
  'service.deleted': { verb: 'deleted', icon: 'trash' }
} as const satisfies Readonly<Record<string, { readonly verb: string; readonly icon: KibanIcon }>>;

/** Display-only event snapshots, safe even when their resources no longer exist. */
export interface ActivityEvent {
  readonly id: string;
  readonly action: keyof typeof ACTIVITY_PRESENTATION;
  readonly resourceName: string;
  readonly projectName: string;
  readonly environmentName: string | null;
  readonly actorEmail: string;
  readonly createdAt: string;
}

export interface ActivityPage {
  /** Current number of retained events across all pages. */
  readonly total: number;
  readonly items: readonly ActivityEvent[];
  readonly page: number;
  readonly hasMore: boolean;
}
