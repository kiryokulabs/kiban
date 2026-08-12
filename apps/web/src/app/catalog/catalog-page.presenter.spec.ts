import { describe, expect, it } from 'vitest';
import { CatalogPagePresenter } from './catalog-page.presenter';
import type { CatalogItem } from './catalog.models';

const createItem = (id: string, categoryId: string, categoryName: string): CatalogItem => ({
  id,
  name: id,
  description: `${id} description`,
  author: 'Kiban',
  runtimeImage: `${id}:latest`,
  category: { id: categoryId, name: categoryName },
  metadata: {},
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

  it('lets search results escape the selected category', () => {
    const presenter = new CatalogPagePresenter();
    const items = [createItem('postgresql', 'databases', 'Databases'), createItem('grafana', 'monitoring', 'Monitoring')];

    expect(presenter.visibleItemsForSearch(items, 'databases', 'grafana')).toEqual([items[1]]);
  });
});

const createProject = (id: string, name: string, environmentNames: readonly string[]) => ({
  id,
  name,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  environments: environmentNames.map((environmentName, index) => ({
    id: `${id}-env-${index + 1}`,
    projectId: id,
    name: environmentName,
    slug: environmentName.toLowerCase(),
    type: 'system' as const,
    description: null,
    status: 'Empty' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }))
});

describe('CatalogPagePresenter install targets', () => {
  it('flattens project environments into selectable install targets', () => {
    const presenter = new CatalogPagePresenter();
    const projects = [createProject('project-1', 'CRM', ['Development', 'Production']), createProject('project-2', 'Website', ['Staging'])];

    expect(presenter.installTargets(projects)).toEqual([
      { id: 'project-1:project-1-env-1', projectId: 'project-1', projectName: 'CRM', environmentId: 'project-1-env-1', environmentName: 'Development' },
      { id: 'project-1:project-1-env-2', projectId: 'project-1', projectName: 'CRM', environmentId: 'project-1-env-2', environmentName: 'Production' },
      { id: 'project-2:project-2-env-1', projectId: 'project-2', projectName: 'Website', environmentId: 'project-2-env-1', environmentName: 'Staging' }
    ]);
  });

  it('groups targets by project for an intuitive install modal', () => {
    const presenter = new CatalogPagePresenter();
    const projects = [createProject('project-1', 'CRM', ['Development', 'Production']), createProject('project-2', 'Website', ['Staging'])];

    expect(presenter.installTargetGroups(projects)).toEqual([
      { projectId: 'project-1', projectName: 'CRM', targets: [
        { id: 'project-1:project-1-env-1', projectId: 'project-1', projectName: 'CRM', environmentId: 'project-1-env-1', environmentName: 'Development' },
        { id: 'project-1:project-1-env-2', projectId: 'project-1', projectName: 'CRM', environmentId: 'project-1-env-2', environmentName: 'Production' }
      ] },
      { projectId: 'project-2', projectName: 'Website', targets: [
        { id: 'project-2:project-2-env-1', projectId: 'project-2', projectName: 'Website', environmentId: 'project-2-env-1', environmentName: 'Staging' }
      ] }
    ]);
  });

  it('toggles individual targets without mutating the current selection', () => {
    const presenter = new CatalogPagePresenter();
    const current = new Set<string>(['project-1:env-1']);

    const added = presenter.toggleTarget(current, 'project-1:env-2');
    const removed = presenter.toggleTarget(added, 'project-1:env-1');

    expect([...current]).toEqual(['project-1:env-1']);
    expect([...added].sort()).toEqual(['project-1:env-1', 'project-1:env-2']);
    expect([...removed]).toEqual(['project-1:env-2']);
  });

  it('resolves selected target ids to install requests', () => {
    const presenter = new CatalogPagePresenter();
    const projects = [createProject('project-1', 'CRM', ['Development', 'Production'])];
    const selected = new Set(['project-1:project-1-env-2']);

    expect(presenter.selectedInstallTargets(projects, selected)).toEqual([
      { id: 'project-1:project-1-env-2', projectId: 'project-1', projectName: 'CRM', environmentId: 'project-1-env-2', environmentName: 'Production' }
    ]);
  });
});
