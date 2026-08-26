import { describe, expect, it, vi } from 'vitest';
import { DatabaseService, type SqliteExecutor } from './database.service';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => { resolve = innerResolve; });
  return { promise, resolve };
};

describe('DatabaseService concurrency', () => {
  it('serializes sqlite CLI executions to avoid concurrent writer locks', async () => {
    const first = deferred<{ readonly stdout: string }>();
    const started: string[] = [];
    const executor: SqliteExecutor = async (_file, args) => {
      const sql = args.at(-1) ?? '';
      started.push(sql);
      if (sql.includes('first')) return first.promise;
      return { stdout: '' };
    };
    const database = new DatabaseService({ databasePath: '/tmp/kiban.sqlite', executor });

    const firstRun = database.run('INSERT INTO test VALUES (?)', ['first']);
    const secondRun = database.run('INSERT INTO test VALUES (?)', ['second']);
    await vi.waitFor(() => {
      expect(started).toEqual(["INSERT INTO test VALUES ('first')"]);
    });

    first.resolve({ stdout: '' });
    await Promise.all([firstRun, secondRun]);

    expect(started).toEqual(["INSERT INTO test VALUES ('first')", "INSERT INTO test VALUES ('second')"]);
  });

  it('configures sqlite busy timeout for each CLI invocation', async () => {
    let capturedArgs: readonly string[] = [];
    const executor: SqliteExecutor = async (_file, args) => {
      capturedArgs = args;
      return { stdout: '' };
    };
    const database = new DatabaseService({ databasePath: '/tmp/kiban.sqlite', executor });

    await database.run('SELECT 1');

    expect(capturedArgs).toContain('-cmd');
    expect(capturedArgs).toContain('.timeout 10000');
  });
});
