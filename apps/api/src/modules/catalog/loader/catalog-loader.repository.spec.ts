import { describe, expect, it } from 'vitest';
import { CatalogValidationError } from '@kiban/core';
import type { ServiceDefinition } from '@kiban/core';
import { CatalogLoader } from './catalog.loader';
import { CatalogLoaderRepository } from './catalog-loader.repository';

const makeDefinition = (id: string, category: string): ServiceDefinition => ({
  id,
  metadata: { id, name: id, description: 'desc', category, author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [] },
  composeYaml: 'services:\n  svc:\n    image: img:1\n',
  runtime: {
    services: [{
      name: 'svc', image: 'img', tag: '1', ports: [], environment: [], volumes: [],
      restart: 'unless-stopped' as const, dependsOn: [], labels: {}
    }]
  },
  schema: {},
  icon: '<svg></svg>',
  sourcePath: '/catalog/test'
});

class FakeLoader {
  public loadCallCount = 0;
  public constructor(private readonly definitions: readonly ServiceDefinition[]) {}
  public async load(): Promise<readonly ServiceDefinition[]> {
    this.loadCallCount++;
    return this.definitions;
  }
}

class ErrorLoader {
  public async load(): Promise<never> {
    throw new CatalogValidationError([{ file: 'x/compose.yaml', service: 'x', reason: 'bad file' }]);
  }
}

const asLoader = (fake: FakeLoader | ErrorLoader): CatalogLoader => fake as unknown as CatalogLoader;

describe('CatalogLoaderRepository', () => {
  it('listItems returns ServiceDefinition[] loaded by the wrapped loader', async () => {
    const defs = [makeDefinition('postgresql', 'databases')];
    const repo = new CatalogLoaderRepository(asLoader(new FakeLoader(defs)));
    const items = await repo.listItems();
    expect(items).toEqual(defs);
  });

  it('listCategories derives unique CatalogCategory objects from loaded definitions', async () => {
    const defs = [makeDefinition('postgresql', 'databases'), makeDefinition('mysql', 'databases')];
    const repo = new CatalogLoaderRepository(asLoader(new FakeLoader(defs)));
    const categories = await repo.listCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({ id: 'databases', name: 'Databases' });
  });

  it('listCategories formats hyphenated category ids to title case', async () => {
    const defs = [makeDefinition('app', 'backend-platforms')];
    const repo = new CatalogLoaderRepository(asLoader(new FakeLoader(defs)));
    const categories = await repo.listCategories();
    expect(categories[0]).toMatchObject({ id: 'backend-platforms', name: 'Backend Platforms' });
  });

  it('listCategories sorts categories alphabetically by name', async () => {
    const defs = [
      makeDefinition('nginx', 'web-servers'),
      makeDefinition('pg', 'databases'),
      makeDefinition('redis', 'caching')
    ];
    const repo = new CatalogLoaderRepository(asLoader(new FakeLoader(defs)));
    const categories = await repo.listCategories();
    expect(categories.map((c) => c.id)).toEqual(['caching', 'databases', 'web-servers']);
  });

  it('caches the load result so loader.load() is only called once for repeated listItems() calls', async () => {
    const loader = new FakeLoader([makeDefinition('svc', 'test')]);
    const repo = new CatalogLoaderRepository(asLoader(loader));
    await repo.listItems();
    await repo.listItems();
    expect(loader.loadCallCount).toBe(1);
  });

  it('also caches when listCategories triggers the first load', async () => {
    const loader = new FakeLoader([makeDefinition('svc', 'test')]);
    const repo = new CatalogLoaderRepository(asLoader(loader));
    await repo.listCategories();
    await repo.listItems();
    expect(loader.loadCallCount).toBe(1);
  });

  it('propagates CatalogValidationError thrown by load()', async () => {
    const repo = new CatalogLoaderRepository(asLoader(new ErrorLoader()));
    await expect(repo.listItems()).rejects.toBeInstanceOf(CatalogValidationError);
  });
});
