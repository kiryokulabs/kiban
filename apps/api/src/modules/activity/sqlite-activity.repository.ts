import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ActivityAction, ActivityEvent, ActivityInput, ActivityPage, ActivityRepository } from '@kiban/core';
import { DatabaseService, type SqliteRow } from '../../database/database.service';

interface ActivityRow extends SqliteRow {
  readonly id: string;
  readonly action: ActivityAction;
  readonly actor_id: string;
  readonly actor_email: string;
  readonly resource_id: string;
  readonly resource_name: string;
  readonly project_id: string;
  readonly project_name: string;
  readonly environment_id: string | null;
  readonly environment_name: string | null;
  readonly created_at: number;
}

@Injectable()
export class SqliteActivityRepository implements ActivityRepository {
  public constructor(private readonly database: DatabaseService) {}

  /** Inserts a whitelisted snapshot and trims the auxiliary table in one transaction. */
  public async append(event: ActivityInput): Promise<void> {
    const insert = this.database.toStatement(`INSERT INTO activity_events
      (id, action, actor_id, actor_email, resource_id, resource_name, project_id, project_name, environment_id, environment_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [randomUUID(), event.action, event.actorId, event.actorEmail, event.resourceId, event.resourceName, event.projectId, event.projectName, event.environmentId, event.environmentName, new Date()]);
    await this.database.run(`BEGIN IMMEDIATE;\n${insert}\nDELETE FROM activity_events WHERE rowid NOT IN (SELECT rowid FROM activity_events ORDER BY created_at DESC, rowid DESC LIMIT 1000);\nCOMMIT;`);
  }

  /** Uses a stable tie-breaker when several operations finish in the same millisecond. */
  public listRecent(): Promise<readonly ActivityEvent[]> {
    return this.read(5, 0);
  }

  public async listPage(page: number): Promise<ActivityPage> {
    const rows = await this.read(11, (page - 1) * 10);
    const count = await this.database.get<{ total: number }>('SELECT COUNT(*) AS total FROM activity_events');
    return { items: rows.slice(0, 10), page, hasMore: rows.length > 10, total: count?.total ?? 0 };
  }

  private async read(limit: number, offset: number): Promise<readonly ActivityEvent[]> {
    const rows = await this.database.all<ActivityRow>('SELECT * FROM activity_events ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?', [limit, offset]);
    return rows.map(row => ({ id: row.id, action: row.action, actorId: row.actor_id, actorEmail: row.actor_email, resourceId: row.resource_id, resourceName: row.resource_name, projectId: row.project_id, projectName: row.project_name, environmentId: row.environment_id, environmentName: row.environment_name, createdAt: new Date(row.created_at) }));
  }
}
