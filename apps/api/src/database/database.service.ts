import { Injectable, OnModuleInit } from '@nestjs/common';
import { createKibanPaths } from '@kiban/config';
import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SqliteParameter = string | number | null | Date;
export type SqliteRow = Readonly<Record<string, string | number | null>>;

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly databasePath: string;

  public constructor() {
    const paths = createKibanPaths(homedir());
    mkdirSync(paths.database, { recursive: true });
    this.databasePath = `${paths.database}/kiban.sqlite`;
  }

  /** Ensures the foundational SQLite schema exists for local development. */
  public async onModuleInit(): Promise<void> {
    await this.exec(`
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
    `);

    await this.addColumnIfMissing('environments', 'description', 'TEXT');
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
    const args = json ? ['-json', this.databasePath, sql] : [this.databasePath, sql];
    const result = await execFileAsync('sqlite3', args, { maxBuffer: 1024 * 1024 });
    return result.stdout;
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
