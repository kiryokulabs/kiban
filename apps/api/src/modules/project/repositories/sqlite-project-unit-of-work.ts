import { Injectable } from '@nestjs/common';
import type { ProjectTransaction, ProjectUnitOfWork } from '@kiban/core';
import { DatabaseService, SqliteParameter, SqliteRow } from '../../../database/database.service';
import type { DatabaseExecutor } from './sqlite-project.repository';
import { SqliteEnvironmentRepository } from './sqlite-environment.repository';
import { SqliteProjectRepository } from './sqlite-project.repository';

class BufferedDatabaseExecutor implements DatabaseExecutor {
  private readonly statements: string[] = [];

  public constructor(private readonly database: DatabaseService) {}

  public async run(sql: string, params: readonly SqliteParameter[] = []): Promise<void> {
    this.statements.push(this.database.toStatement(sql, params));
  }

  public async get<T extends SqliteRow>(_sql: string, _params: readonly SqliteParameter[] = []): Promise<T | null> {
    throw new Error('Transactional reads are not supported in this project unit of work.');
  }

  public async all<T extends SqliteRow>(_sql: string, _params: readonly SqliteParameter[] = []): Promise<readonly T[]> {
    throw new Error('Transactional reads are not supported in this project unit of work.');
  }

  public toSqlBatch(): string {
    return this.statements.map((statement) => statement.trim().endsWith(';') ? statement.trim() : `${statement.trim()};`).join('\n');
  }
}

@Injectable()
export class SqliteProjectUnitOfWork implements ProjectUnitOfWork {
  public constructor(private readonly database: DatabaseService) {}

  /** Runs project writes as one SQLite transaction. */
  public async transaction<T>(operation: (transaction: ProjectTransaction) => Promise<T>): Promise<T> {
    const executor = new BufferedDatabaseExecutor(this.database);
    const transaction = {
      projects: new SqliteProjectRepository(executor),
      environments: new SqliteEnvironmentRepository(executor)
    } satisfies ProjectTransaction;
    const result = await operation(transaction);
    await this.database.exec(`BEGIN;\n${executor.toSqlBatch()}\nCOMMIT;`);
    return result;
  }
}
