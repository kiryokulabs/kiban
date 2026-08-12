import { Inject, Injectable } from '@nestjs/common';
import type { CreateProjectRecordInput, Project, ProjectRepository, ProjectSummary, UpdateProjectRecordInput } from '@kiban/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService, SqliteParameter, SqliteRow } from '../../../database/database.service';

export interface DatabaseExecutor {
  run(sql: string, params?: readonly SqliteParameter[]): Promise<void>;
  get<T extends SqliteRow>(sql: string, params?: readonly SqliteParameter[]): Promise<T | null>;
  all<T extends SqliteRow>(sql: string, params?: readonly SqliteParameter[]): Promise<readonly T[]>;
}

interface ProjectRow extends SqliteRow { readonly id: string; readonly name: string; readonly description: string | null; readonly created_at: number; readonly updated_at: number; }
interface ProjectSummaryRow extends ProjectRow { readonly environment_count: number; readonly service_count: number; readonly running_service_count: number; readonly non_running_service_count: number; }

@Injectable()
export class SqliteProjectRepository implements ProjectRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseExecutor) {}

  /** Creates a project record. */
  public async create(input: CreateProjectRecordInput): Promise<Project> {
    const project: Project = { id: randomUUID(), name: input.name, description: input.description, createdAt: new Date(), updatedAt: new Date() };
    await this.database.run('INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [project.id, project.name, project.description, project.createdAt, project.updatedAt]);
    return project;
  }

  /** Finds a project by id. */
  public async findById(id: string): Promise<Project | null> {
    const row = await this.database.get<ProjectRow>('SELECT * FROM projects WHERE id = ? LIMIT 1', [id]);
    return row ? this.toProject(row) : null;
  }

  /** Lists project summaries with environment counts. */
  public async list(): Promise<readonly ProjectSummary[]> {
    const rows = await this.database.all<ProjectSummaryRow>(`SELECT p.*, COUNT(DISTINCT e.id) as environment_count, COUNT(s.id) as service_count, SUM(CASE WHEN s.status = 'running' THEN 1 ELSE 0 END) as running_service_count, SUM(CASE WHEN s.id IS NOT NULL AND s.status != 'running' THEN 1 ELSE 0 END) as non_running_service_count FROM projects p LEFT JOIN environments e ON e.project_id = p.id LEFT JOIN installed_services s ON s.environment_id = e.id GROUP BY p.id ORDER BY p.created_at DESC`);
    return rows.map((row) => {
      const serviceCount = Number(row.service_count ?? 0);
      const runningServiceCount = Number(row.running_service_count ?? 0);
      const nonRunningServiceCount = Number(row.non_running_service_count ?? 0);
      return { project: this.toProject(row), environmentCount: Number(row.environment_count), serviceCount, runningServiceCount, healthStatus: serviceCount === 0 ? 'empty' : nonRunningServiceCount === 0 ? 'healthy' : 'degraded' };
    });
  }

  /** Updates editable project fields. */
  public async update(id: string, input: UpdateProjectRecordInput): Promise<Project | null> {
    await this.database.run('UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?', [input.name, input.description, new Date(), id]);
    return this.findById(id);
  }

  /** Deletes a project. */
  public async delete(id: string): Promise<boolean> {
    await this.database.run('DELETE FROM projects WHERE id = ?', [id]);
    return true;
  }

  private toProject(row: ProjectRow): Project {
    return { id: row.id, name: row.name, description: row.description, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) };
  }
}
