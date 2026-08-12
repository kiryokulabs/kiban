import { describe, expect, it, vi } from 'vitest';
import { SqliteProjectUnitOfWork } from './sqlite-project-unit-of-work';

interface CapturingDatabase {
  readonly batches: string[];
  toStatement(sql: string, params?: readonly unknown[]): string;
  exec(sql: string): Promise<void>;
}

const createDatabase = (): CapturingDatabase => ({
  batches: [],
  toStatement: (sql: string) => sql,
  exec: vi.fn(async function exec(this: CapturingDatabase, sql: string): Promise<void> { this.batches.push(sql); })
});

describe('SqliteProjectUnitOfWork', () => {
  it('separates buffered SQL statements with semicolons inside the transaction batch', async () => {
    const database = createDatabase();
    const unitOfWork = new SqliteProjectUnitOfWork(database as never);

    await unitOfWork.transaction(async (transaction) => {
      await transaction.projects.create({ name: 'CrossMetrics', description: null });
      await transaction.environments.create({ projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null });
    });

    expect(database.batches[0]).toContain('BEGIN;');
    expect(database.batches[0]).toContain(');\nINSERT INTO environments');
    expect(database.batches[0]).toContain('COMMIT;');
  });
});
