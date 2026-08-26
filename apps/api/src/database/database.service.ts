import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { createKibanPaths } from '@kiban/config';
import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SQLITE_BUSY_TIMEOUT_COMMAND = '.timeout 10000';
export const DATABASE_SERVICE_OPTIONS = Symbol('DATABASE_SERVICE_OPTIONS');

export interface DatabaseServiceOptions {
  readonly databasePath?: string;
  readonly executor?: SqliteExecutor;
}

export type SqliteExecutor = (file: string, args: readonly string[]) => Promise<{ readonly stdout: string }>;

export type SqliteParameter = string | number | null | Date;
export type SqliteRow = Readonly<Record<string, string | number | null>>;

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly databasePath: string;
  private readonly executor: SqliteExecutor;
  private queue: Promise<void> = Promise.resolve();

  public constructor(@Optional() @Inject(DATABASE_SERVICE_OPTIONS) options: DatabaseServiceOptions = {}) {
    const paths = createKibanPaths(homedir());
    mkdirSync(paths.database, { recursive: true });
    this.databasePath = options.databasePath ?? `${paths.database}/kiban.sqlite`;
    this.executor = options.executor ?? (async (file, args) => execFileAsync(file, [...args], { maxBuffer: 1024 * 1024 }));
  }

  /** Ensures the foundational SQLite schema exists for local development. */
  public async onModuleInit(): Promise<void> {
    await this.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS installed_plugins (
        id TEXT PRIMARY KEY,
        manifest_json TEXT NOT NULL,
        installed_at INTEGER NOT NULL,
        enabled INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        revoked_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS installed_services (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        configuration_json TEXT NOT NULL,
        runtime_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(environment_id, name),
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );
    `);

    await this.addColumnIfMissing('environments', 'description', 'TEXT');
    await this.addColumnIfMissing('installed_services', 'runtime_json', 'TEXT');
  }

  private async addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
    const columns = await this.all<{ readonly name: string }>(`PRAGMA table_info(${table})`);
    if (!columns.some((existing) => existing.name === column)) {
      await this.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    }
  }

  /** Executes a SQL statement without returning rows. */
  public async exec(sql: string): Promise<void> {
    await this.runSql(sql);
  }

  /** Returns all rows for a SQL query. */
  public async all<T extends SqliteRow>(sql: string, params: readonly SqliteParameter[] = []): Promise<readonly T[]> {
    const output = await this.runSql(this.interpolate(sql, params), true);
    if (!output.trim()) {
      return [];
    }
    return JSON.parse(output) as readonly T[];
  }

  /** Returns the first row for a SQL query. */
  public async get<T extends SqliteRow>(sql: string, params: readonly SqliteParameter[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params);
    return rows[0] ?? null;
  }

  /** Runs a SQL statement with parameters. */
  public async run(sql: string, params: readonly SqliteParameter[] = []): Promise<void> {
    await this.runSql(this.interpolate(sql, params));
  }

  private async runSql(sql: string, json = false): Promise<string> {
    return this.enqueue(async () => {
      const args = json ? ['-json', '-cmd', SQLITE_BUSY_TIMEOUT_COMMAND, this.databasePath, sql] : ['-cmd', SQLITE_BUSY_TIMEOUT_COMMAND, this.databasePath, sql];
      const result = await this.executor('sqlite3', args);
      return result.stdout;
    });
  }

  private async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.catch(() => undefined).then(operation);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  /** Renders a parameterized SQL statement for sqlite3 CLI execution. */
  public toStatement(sql: string, params: readonly SqliteParameter[] = []): string {
    return this.interpolate(sql, params);
  }

  private interpolate(sql: string, params: readonly SqliteParameter[]): string {
    let index = 0;
    return sql.replace(/\?/g, () => {
      const value = params[index];
      index += 1;
      return this.toSqlLiteral(value ?? null);
    });
  }

  private toSqlLiteral(value: SqliteParameter): string {
    if (value === null) {
      return 'NULL';
    }
    if (value instanceof Date) {
      return String(value.getTime());
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return `'${value.replaceAll("'", "''")}'`;
  }
}
