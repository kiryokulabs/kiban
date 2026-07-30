import { Inject, Injectable } from '@nestjs/common';
import type { CreateEnvironmentRecordInput, Environment, EnvironmentRepository, EnvironmentType } from '@kiban/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService, type SqliteRow } from '../../../database/database.service';
import type { DatabaseExecutor } from './sqlite-project.repository';

interface EnvironmentRow extends SqliteRow { readonly id: string; readonly project_id: string; readonly name: string; readonly slug: string; readonly type: string; readonly description: string | null; readonly created_at: number; readonly updated_at: number; }

@Injectable()
export class SqliteEnvironmentRepository implements EnvironmentRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseExecutor) {}

  /** Creates an environment record. */
  public async create(input: CreateEnvironmentRecordInput): Promise<Environment> {
    const environment: Environment = { id: randomUUID(), projectId: input.projectId, name: input.name, slug: input.slug, type: input.type, description: input.description, createdAt: new Date(), updatedAt: new Date() };
    await this.database.run('INSERT INTO environments (id, project_id, name, slug, type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [environment.id, environment.projectId, environment.name, environment.slug, environment.type, environment.description, environment.createdAt, environment.updatedAt]);
    return environment;
  }

  /** Lists environments for a project. */
  public async listByProjectId(projectId: string): Promise<readonly Environment[]> {
    const rows = await this.database.all<EnvironmentRow>('SELECT * FROM environments WHERE project_id = ? ORDER BY created_at ASC', [projectId]);
    return rows.map((row) => this.toEnvironment(row));
  }

  /** Finds an environment by id. */
  public async findById(id: string): Promise<Environment | null> {
    const row = await this.database.get<EnvironmentRow>('SELECT * FROM environments WHERE id = ? LIMIT 1', [id]);
    return row ? this.toEnvironment(row) : null;
  }

  /** Deletes an environment by id. */
  public async deleteById(id: string): Promise<void> {
    await this.database.run('DELETE FROM environments WHERE id = ?', [id]);
  }

  /** Deletes environments for a project. */
  public async deleteByProjectId(projectId: string): Promise<void> {
    await this.database.run('DELETE FROM environments WHERE project_id = ?', [projectId]);
  }

  private toEnvironment(row: EnvironmentRow): Environment {
    return { id: row.id, projectId: row.project_id, name: row.name, slug: row.slug, type: row.type as EnvironmentType, description: row.description ?? null, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) };
  }
}
