
import type { CatalogCategory, CatalogItem, CatalogRepository } from '@kiban/core';
import type { PluginManifest } from '@kiban/plugin-sdk';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const REQUIRED_FILES = ['metadata.json', 'compose.yaml', 'schema.json', 'icon.svg'] as const;

export class FilesystemCatalogRepository implements CatalogRepository {
  private readonly root: string;

  private constructor(root: string) {
    this.root = root;
  }

  /** Creates a catalog repository rooted at the current workspace catalog directory. */
  public static fromWorkspace(): FilesystemCatalogRepository {
    const probe = new FilesystemCatalogRepository(process.cwd());
    return new FilesystemCatalogRepository(join(probe.findWorkspaceRoot(process.cwd()), 'catalog'));
  }

  /** Creates a catalog repository for a specific catalog root. */
  public static fromRoot(root: string): FilesystemCatalogRepository {
    return new FilesystemCatalogRepository(root);
  }

  /** Lists categories derived from discovered service folders. */
  public async listCategories(): Promise<readonly CatalogCategory[]> {
    const items = await this.listItems();
    const categories = new Map<string, CatalogCategory>();
    for (const item of items) {
      categories.set(item.category.id, item.category);
    }
    return [...categories.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  /** Lists every valid service definition discovered under the catalog root. */
  public async listItems(): Promise<readonly CatalogItem[]> {
    if (!existsSync(this.root)) {
      return [];
    }
    return this.discoverServiceDirectories(this.root)
      .map((servicePath) => this.readService(servicePath))
      .filter((item): item is CatalogItem => item !== null)
      .sort((left, right) => left.category.name.localeCompare(right.category.name) || left.name.localeCompare(right.name));
  }

  private discoverServiceDirectories(root: string): readonly string[] {
    const directories: string[] = [];
    const visit = (current: string): void => {
      if (REQUIRED_FILES.every((file) => existsSync(join(current, file)))) {
        directories.push(current);
        return;
      }
      for (const entry of readdirSync(current)) {
        const child = join(current, entry);
        if (statSync(child).isDirectory()) {
          visit(child);
        }
      }
    };
    visit(root);
    return directories;
  }

  private readService(servicePath: string): CatalogItem | null {
    try {
      const metadata = this.readJson(join(servicePath, 'metadata.json'));
      const manifest = this.parseManifest(metadata);
      const category = this.categoryFromManifest(manifest);
      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        category,
        metadata: manifest,
        compose: readFileSync(join(servicePath, 'compose.yaml'), 'utf8'),
        schema: this.readJson(join(servicePath, 'schema.json')),
        icon: readFileSync(join(servicePath, 'icon.svg'), 'utf8'),
        sourcePath: servicePath
      };
    } catch {
      return null;
    }
  }

  private categoryFromManifest(manifest: PluginManifest): CatalogCategory {
    return {
      id: manifest.category,
      name: this.titleCase(manifest.category),
      description: `${this.titleCase(manifest.category)} services`
    };
  }

  private readJson(path: string): Readonly<Record<string, unknown>> {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Catalog JSON must be an object.');
    }
    return parsed as Readonly<Record<string, unknown>>;
  }

  private parseManifest(value: Readonly<Record<string, unknown>>): PluginManifest {
    const required = ['id', 'name', 'description', 'version', 'author', 'category', 'minimumVersion'] as const;
    for (const key of required) {
      if (typeof value[key] !== 'string' || !value[key]) {
        throw new Error(`Invalid catalog metadata: ${key}`);
      }
    }
    return value as unknown as PluginManifest;
  }

  private titleCase(value: string): string {
    return value.split('-').map((part) => part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part).join(' ');
  }

  private findWorkspaceRoot(start: string): string {
    let current = resolve(start);
    while (current !== dirname(current)) {
      if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
        return current;
      }
      current = dirname(current);
    }
    return resolve(start);
  }
}
