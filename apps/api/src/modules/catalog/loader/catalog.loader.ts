import type {
  AccessPoint,
  AccessPointConnection,
  CatalogValidationIssue,
  RuntimeSpec,
  ServiceDefinition,
  ServiceMetadata
} from '@kiban/core';
import { CatalogValidationError } from '@kiban/core';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { normalizeComposeDocument } from '../compose/compose.normalizer';
import { parseComposeYaml } from '../compose/parse-compose-yaml';
import { validateComposeDocument } from '../compose/compose.validator';

/** The four files every catalog service must ship. */
const REQUIRED_FILES = ['compose.yaml', 'metadata.json', 'schema.json', 'icon.svg'] as const;

/** Allowed metadata.json keys. Anything else is rejected. */
const METADATA_KEYS = new Set([
  'id',
  'name',
  'description',
  'category',
  'author',
  'minimumVersion',
  'icon',
  'tags',
  'documentation',
  'website',
  'license',
  'featured',
  'accessPoints'
]);

/** Allowed access point keys. */
const ACCESS_POINT_KEYS = new Set(['name', 'kind', 'service', 'port', 'connection']);

/** Allowed connection block keys. */
const CONNECTION_KEYS = new Set(['username', 'password', 'database']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

/** Recursively freezes an object graph (no cycles exist in catalog data). */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
};

/**
 * Loads every catalog service from the filesystem into frozen ServiceDefinitions.
 *
 * Merges the four required files (compose.yaml, metadata.json, schema.json,
 * icon.svg), validates the whole catalog against the metadata whitelist and the
 * cross-file rules, and aggregates every issue into a single CatalogValidationError.
 * An invalid service is never silently skipped — the loader fails loudly.
 */
export class CatalogLoader {
  private readonly root: string;

  private constructor(root: string) {
    this.root = root;
  }

  /** Creates a loader rooted at the current workspace catalog directory. */
  public static fromWorkspace(): CatalogLoader {
    const start = process.cwd();
    let current = resolve(start);
    while (current !== dirname(current)) {
      if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
        return new CatalogLoader(join(current, 'catalog'));
      }
      current = dirname(current);
    }
    return new CatalogLoader(join(start, 'catalog'));
  }

  /** Creates a loader for a specific catalog root. */
  public static fromRoot(root: string): CatalogLoader {
    return new CatalogLoader(root);
  }

  /**
   * Loads and validates the entire catalog.
   *
   * @throws CatalogValidationError when any service violates a rule; the error
   *         carries every issue across every service for a complete report.
   */
  public async load(): Promise<readonly ServiceDefinition[]> {
    if (!existsSync(this.root)) {
      return [];
    }
    const issues: CatalogValidationIssue[] = [];
    const definitions: ServiceDefinition[] = [];
    const seenIds = new Map<string, string>();

    for (const dir of this.discoverServiceDirectories(this.root)) {
      const folderName = basename(dir);
      const serviceIssues: CatalogValidationIssue[] = [];
      const metadataPath = join(dir, 'metadata.json');
      const composePath = join(dir, 'compose.yaml');
      const schemaPath = join(dir, 'schema.json');

      for (const file of REQUIRED_FILES) {
        if (!existsSync(join(dir, file))) {
          serviceIssues.push({ file: relative(this.root, join(dir, file)), service: folderName, reason: `missing required file "${file}"` });
        }
      }

      const metadata = existsSync(metadataPath) ? this.parseMetadata(dir, folderName, serviceIssues) : undefined;
      const runtime = existsSync(composePath) ? this.parseCompose(composePath, folderName, serviceIssues) : undefined;
      const schemaResult = existsSync(schemaPath)
        ? this.parseSchema(schemaPath, folderName, serviceIssues)
        : { schema: {}, propertyKeys: [] };

      if (metadata !== undefined && runtime !== undefined) {
        this.validateAccessPoints(metadata, runtime, relative(this.root, metadataPath), folderName, serviceIssues);
        this.validateSchemaEnvironment(schemaResult.propertyKeys, runtime, relative(this.root, schemaPath), folderName, serviceIssues);
      }

      if (metadata !== undefined) {
        const existing = seenIds.get(metadata.id);
        if (existing === undefined) {
          seenIds.set(metadata.id, folderName);
        } else {
          serviceIssues.push({ file: relative(this.root, metadataPath), service: folderName, reason: `duplicate service id "${metadata.id}" (also declared in "${existing}")` });
        }
      }

      if (serviceIssues.length > 0) {
        issues.push(...serviceIssues);
        continue;
      }
      if (metadata !== undefined && runtime !== undefined) {
        definitions.push(this.buildDefinition(dir, metadata, runtime, schemaResult.schema));
      }
    }

    if (issues.length > 0) {
      throw new CatalogValidationError(issues);
    }
    definitions.sort(
      (left, right) => left.metadata.category.localeCompare(right.metadata.category) || left.metadata.name.localeCompare(right.metadata.name)
    );
    return Object.freeze(definitions);
  }

  /** Recursively finds directories that contain any required catalog file. */
  private discoverServiceDirectories(current: string): readonly string[] {
    const directories: string[] = [];
    const visit = (path: string): void => {
      if (REQUIRED_FILES.some((file) => existsSync(join(path, file)))) {
        directories.push(path);
        return;
      }
      for (const entry of readdirSync(path)) {
        const child = join(path, entry);
        if (statSync(child).isDirectory()) {
          visit(child);
        }
      }
    };
    visit(current);
    return directories;
  }

  /** Parses metadata.json against the strict whitelist. */
  private parseMetadata(serviceDir: string, folderName: string, issues: CatalogValidationIssue[]): ServiceMetadata | undefined {
    const file = relative(this.root, join(serviceDir, 'metadata.json'));
    const raw = this.readJson(join(serviceDir, 'metadata.json'));
    if (raw === undefined) {
      issues.push({ file, service: folderName, reason: 'metadata.json must be valid JSON' });
      return undefined;
    }
    if (!isObject(raw)) {
      issues.push({ file, service: folderName, reason: 'metadata.json must be a JSON object' });
      return undefined;
    }

    let valid = true;
    for (const key of Object.keys(raw)) {
      if (!METADATA_KEYS.has(key)) {
        issues.push({ file, service: folderName, reason: `unknown metadata key "${key}"` });
        valid = false;
      }
    }
    const required = ['id', 'name', 'description', 'category', 'author', 'minimumVersion'] as const;
    for (const key of required) {
      const value = raw[key];
      if (typeof value !== 'string' || value.length === 0) {
        issues.push({ file, service: folderName, reason: `metadata "${key}" must be a non-empty string` });
        valid = false;
      }
    }
    const optionalStrings = ['icon', 'documentation', 'website', 'license'] as const;
    for (const key of optionalStrings) {
      const value = raw[key];
      if (value !== undefined && typeof value !== 'string') {
        issues.push({ file, service: folderName, reason: `metadata "${key}" must be a string` });
        valid = false;
      }
    }
    const tagsValue = raw['tags'];
    if (tagsValue !== undefined && !isStringArray(tagsValue)) {
      issues.push({ file, service: folderName, reason: 'metadata "tags" must be an array of strings' });
      valid = false;
    }
    const featuredValue = raw['featured'];
    if (featuredValue !== undefined && typeof featuredValue !== 'boolean') {
      issues.push({ file, service: folderName, reason: 'metadata "featured" must be a boolean' });
      valid = false;
    }
    if (raw['id'] !== folderName) {
      issues.push({ file, service: folderName, reason: `metadata id "${String(raw['id'])}" does not match folder name "${folderName}"` });
      valid = false;
    }
    const categoryName = basename(dirname(serviceDir));
    if (raw['category'] !== categoryName) {
      issues.push({ file, service: folderName, reason: `metadata category "${String(raw['category'])}" does not match folder category "${categoryName}"` });
      valid = false;
    }

    const accessPoints = this.parseAccessPoints(raw['accessPoints'], file, folderName, issues);
    if (accessPoints === undefined) {
      valid = false;
    }
    if (!valid || accessPoints === undefined) {
      return undefined;
    }

    const id = typeof raw['id'] === 'string' ? raw['id'] : '';
    const name = typeof raw['name'] === 'string' ? raw['name'] : '';
    const description = typeof raw['description'] === 'string' ? raw['description'] : '';
    const category = typeof raw['category'] === 'string' ? raw['category'] : '';
    const author = typeof raw['author'] === 'string' ? raw['author'] : '';
    const minimumVersion = typeof raw['minimumVersion'] === 'string' ? raw['minimumVersion'] : '';
    const icon = typeof raw['icon'] === 'string' ? raw['icon'] : undefined;
    const documentation = typeof raw['documentation'] === 'string' ? raw['documentation'] : undefined;
    const website = typeof raw['website'] === 'string' ? raw['website'] : undefined;
    const license = typeof raw['license'] === 'string' ? raw['license'] : undefined;
    const tags = isStringArray(raw['tags']) ? raw['tags'] : undefined;
    const featured = typeof raw['featured'] === 'boolean' ? raw['featured'] : undefined;

    return {
      id,
      name,
      description,
      category,
      author,
      minimumVersion,
      ...(icon !== undefined ? { icon } : {}),
      ...(documentation !== undefined ? { documentation } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(license !== undefined ? { license } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(featured !== undefined ? { featured } : {}),
      accessPoints
    };
  }

  /** Parses the accessPoints array and validates each access point shape. */
  private parseAccessPoints(raw: unknown, file: string, folderName: string, issues: CatalogValidationIssue[]): readonly AccessPoint[] | undefined {
    if (raw === undefined || !Array.isArray(raw)) {
      issues.push({ file, service: folderName, reason: 'metadata "accessPoints" must be an array' });
      return undefined;
    }
    const result: AccessPoint[] = [];
    const seenNames = new Set<string>();
    let valid = true;

    for (const entry of raw) {
      if (!isObject(entry)) {
        issues.push({ file, service: folderName, reason: 'access point must be an object' });
        valid = false;
        continue;
      }
      for (const key of Object.keys(entry)) {
        if (!ACCESS_POINT_KEYS.has(key)) {
          issues.push({ file, service: folderName, reason: `unknown access point key "${key}"` });
          valid = false;
        }
      }
      const name = typeof entry['name'] === 'string' ? entry['name'] : undefined;
      const kind = typeof entry['kind'] === 'string' ? entry['kind'] : undefined;
      const service = typeof entry['service'] === 'string' ? entry['service'] : undefined;
      const port = typeof entry['port'] === 'number' && Number.isInteger(entry['port']) && entry['port'] > 0 ? entry['port'] : undefined;

      if (name === undefined || name.length === 0) {
        issues.push({ file, service: folderName, reason: 'access point "name" must be a non-empty string' });
        valid = false;
      }
      if (kind === undefined || kind.length === 0) {
        issues.push({ file, service: folderName, reason: 'access point "kind" must be a non-empty string' });
        valid = false;
      }
      if (service === undefined || service.length === 0) {
        issues.push({ file, service: folderName, reason: 'access point "service" must be a non-empty string' });
        valid = false;
      }
      if (port === undefined) {
        issues.push({ file, service: folderName, reason: 'access point "port" must be a positive integer' });
        valid = false;
      }
      if (name !== undefined) {
        if (seenNames.has(name)) {
          issues.push({ file, service: folderName, reason: `duplicate access point name "${name}"` });
          valid = false;
        }
        seenNames.add(name);
      }

      const connection = this.parseConnection(entry['connection'], file, folderName, issues);
      if (entry['connection'] !== undefined && connection === undefined) {
        valid = false;
      }

      if (name !== undefined && kind !== undefined && service !== undefined && port !== undefined) {
        result.push({
          name,
          kind,
          service,
          port,
          ...(connection !== undefined ? { connection } : {})
        });
      }
    }
    return valid ? result : undefined;
  }

  /** Parses the connection block of an access point. */
  private parseConnection(raw: unknown, file: string, folderName: string, issues: CatalogValidationIssue[]): AccessPointConnection | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (!isObject(raw)) {
      issues.push({ file, service: folderName, reason: 'access point "connection" must be an object' });
      return undefined;
    }
    let valid = true;
    for (const key of Object.keys(raw)) {
      if (!CONNECTION_KEYS.has(key)) {
        issues.push({ file, service: folderName, reason: `unknown connection key "${key}"` });
        valid = false;
      }
      if (typeof raw[key] !== 'string') {
        issues.push({ file, service: folderName, reason: `connection "${key}" must be a string (environment variable name)` });
        valid = false;
      }
    }
    if (!valid) {
      return undefined;
    }
    return {
      ...(typeof raw['username'] === 'string' ? { username: raw['username'] } : {}),
      ...(typeof raw['password'] === 'string' ? { password: raw['password'] } : {}),
      ...(typeof raw['database'] === 'string' ? { database: raw['database'] } : {})
    };
  }

  /** Parses, validates and normalizes compose.yaml into a RuntimeSpec. */
  private parseCompose(path: string, folderName: string, issues: CatalogValidationIssue[]): RuntimeSpec | undefined {
    const file = relative(this.root, path);
    const source = readFileSync(path, 'utf8');

    const parsed = parseComposeYaml(source, { file });
    issues.push(...parsed.issues);
    if (parsed.issues.length > 0) {
      return undefined;
    }

    const validationIssues = validateComposeDocument(parsed.document, { file });
    issues.push(...validationIssues);
    if (validationIssues.length > 0) {
      return undefined;
    }

    const normalized = normalizeComposeDocument(parsed.document, { file });
    issues.push(...normalized.issues);
    return normalized.spec;
  }

  /** Parses schema.json and extracts the config UI property keys. */
  private parseSchema(
    path: string,
    folderName: string,
    issues: CatalogValidationIssue[]
  ): { readonly schema: Readonly<Record<string, unknown>>; readonly propertyKeys: readonly string[] } {
    const file = relative(this.root, path);
    const raw = this.readJson(path);
    if (raw === undefined) {
      issues.push({ file, service: folderName, reason: 'schema.json must be valid JSON' });
      return { schema: {}, propertyKeys: [] };
    }
    if (!isObject(raw)) {
      issues.push({ file, service: folderName, reason: 'schema.json must be a JSON object' });
      return { schema: {}, propertyKeys: [] };
    }
    const properties = raw['properties'];
    const propertyKeys = isObject(properties) ? Object.keys(properties) : [];
    return { schema: raw, propertyKeys };
  }

  /** Every access point must reference an existing compose service and an exposed port. */
  private validateAccessPoints(
    metadata: ServiceMetadata,
    runtime: RuntimeSpec,
    file: string,
    folderName: string,
    issues: CatalogValidationIssue[]
  ): void {
    for (const accessPoint of metadata.accessPoints) {
      const target = runtime.services.find((service) => service.name === accessPoint.service);
      if (target === undefined) {
        issues.push({ file, service: folderName, reason: `access point "${accessPoint.name}" references unknown compose service "${accessPoint.service}"` });
        continue;
      }
      if (!target.ports.some((port) => port.port === accessPoint.port)) {
        issues.push({ file, service: folderName, reason: `access point "${accessPoint.name}" references port ${accessPoint.port} which "${accessPoint.service}" does not expose` });
      }
    }
  }

  /** Every schema field must be declared in the compose environment of some service. */
  private validateSchemaEnvironment(
    propertyKeys: readonly string[],
    runtime: RuntimeSpec,
    file: string,
    folderName: string,
    issues: CatalogValidationIssue[]
  ): void {
    if (propertyKeys.length === 0) {
      return;
    }
    const envKeys = new Set(runtime.services.flatMap((service) => service.environment.map((entry) => entry.key)));
    for (const key of propertyKeys) {
      if (!envKeys.has(key)) {
        issues.push({ file, service: folderName, reason: `schema field "${key}" is not declared in the compose environment` });
      }
    }
  }

  /** Builds a frozen ServiceDefinition from validated inputs. */
  private buildDefinition(
    dir: string,
    metadata: ServiceMetadata,
    runtime: RuntimeSpec,
    schema: Readonly<Record<string, unknown>>
  ): ServiceDefinition {
    return deepFreeze({
      id: metadata.id,
      metadata,
      composeYaml: readFileSync(join(dir, 'compose.yaml'), 'utf8'),
      runtime,
      schema,
      icon: readFileSync(join(dir, 'icon.svg'), 'utf8'),
      sourcePath: dir
    });
  }

  /** Parses JSON; returns undefined when the file is missing or malformed. */
  private readJson(path: string): unknown {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return undefined;
    }
  }
}
