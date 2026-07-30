import { describe, expect, it } from 'vitest';
import { CatalogPagePresenter } from './catalog-page.presenter';
import type { CatalogItem } from './catalog.models';

const createItem = (id: string, categoryId: string, categoryName: string): CatalogItem => ({
  id,
  name: id,
  description: `${id} description`,
  version: '1.0.0',
  author: 'Kiban',
  category: { id: categoryId, name: categoryName },
  metadata: {},
  compose: '',
  schema: {},
  icon: '<svg></svg>'
});

describe('CatalogPagePresenter', () => {
  it('returns every item when All is selected', () => {
    const presenter = new CatalogPagePresenter();
    const items = [createItem('postgresql', 'databases', 'Databases'), createItem('nats', 'messaging', 'Messaging')];

    expect(presenter.visibleItems(items, 'all')).toEqual(items);
  });

  it('returns only services from the selected category', () => {
    const presenter = new CatalogPagePresenter();
    const items = [createItem('postgresql', 'databases', 'Databases'), createItem('nats', 'messaging', 'Messaging')];

    expect(presenter.visibleItems(items, 'databases')).toEqual([items[0]]);
  });

  it('counts services by category and includes All', () => {
    const presenter = new CatalogPagePresenter();
    const items = [createItem('postgresql', 'databases', 'Databases'), createItem('mysql', 'databases', 'Databases'), createItem('nats', 'messaging', 'Messaging')];

    expect(presenter.countForCategory(items, 'all')).toBe(3);
    expect(presenter.countForCategory(items, 'databases')).toBe(2);
    expect(presenter.countForCategory(items, 'messaging')).toBe(1);
  });
});
