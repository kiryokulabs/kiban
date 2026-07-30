import { Inject, Injectable } from '@nestjs/common';
import type { InstalledService, InstalledServiceRepository, InstalledServiceStatus } from '@kiban/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService, type SqliteRow } from '../../../database/database.service';

interface InstalledServiceRow extends SqliteRow { readonly id: string; readonly environment_id: string; readonly service_id: string; readonly name: string; readonly status: string; readonly configuration_json: string; readonly runtime_json: string | null; readonly created_at: number; readonly updated_at: number; }

@Injectable()
export class SqliteInstalledServiceRepository implements InstalledServiceRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Creates an installed service record. */
  public async create(input: Omit<InstalledService, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstalledService> {
    const service: InstalledService = { ...input, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    await this.database.run('INSERT INTO installed_services (id, environment_id, service_id, name, status, configuration_json, runtime_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [service.id, service.environmentId, service.serviceId, service.name, service.status, JSON.stringify(service.configuration), service.runtime ? JSON.stringify(service.runtime) : null, service.createdAt, service.updatedAt]);
    return service;
  }

  /** Finds an installed service by id. */
  public async findById(id: string): Promise<InstalledService | null> {
    const row = await this.database.get<InstalledServiceRow>('SELECT * FROM installed_services WHERE id = ? LIMIT 1', [id]);
    return row ? this.toInstalledService(row) : null;
  }

  /** Lists every installed service. */
  public async listAll(): Promise<readonly InstalledService[]> {
    const rows = await this.database.all<InstalledServiceRow>('SELECT * FROM installed_services ORDER BY created_at DESC');
    return rows.map((row) => this.toInstalledService(row));
  }

  /** Lists services installed in an environment. */
  public async listByEnvironmentId(environmentId: string): Promise<readonly InstalledService[]> {
    const rows = await this.database.all<InstalledServiceRow>('SELECT * FROM installed_services WHERE environment_id = ? ORDER BY created_at DESC', [environmentId]);
    return rows.map((row) => this.toInstalledService(row));
  }

  /** Finds an installed service by environment and display name. */
  public async findByEnvironmentIdAndName(environmentId: string, name: string): Promise<InstalledService | null> {
    const row = await this.database.get<InstalledServiceRow>('SELECT * FROM installed_services WHERE environment_id = ? AND name = ? LIMIT 1', [environmentId, name]);
    return row ? this.toInstalledService(row) : null;
  }

  /** Updates service status. */
  public async updateStatus(id: string, status: InstalledServiceStatus, runtime?: Readonly<Record<string, unknown>> | null): Promise<InstalledService | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.database.run('UPDATE installed_services SET status = ?, runtime_json = ?, updated_at = ? WHERE id = ?', [status, runtime === undefined ? existing.runtime ? JSON.stringify(existing.runtime) : null : runtime ? JSON.stringify(runtime) : null, new Date(), id]);
    return this.findById(id);
  }

  /** Deletes an installed service record. */
  public async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await this.database.run('DELETE FROM installed_services WHERE id = ?', [id]);
    return true;
  }

  private toInstalledService(row: InstalledServiceRow): InstalledService {
    return { id: row.id, environmentId: row.environment_id, serviceId: row.service_id, name: row.name, status: row.status as InstalledServiceStatus, configuration: JSON.parse(row.configuration_json) as Readonly<Record<string, unknown>>, runtime: row.runtime_json ? JSON.parse(row.runtime_json) as Readonly<Record<string, unknown>> : null, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) };
  }
}
