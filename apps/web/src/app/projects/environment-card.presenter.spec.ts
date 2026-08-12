import { describe, expect, it } from 'vitest';
import { EnvironmentCardPresenter } from './environment-card.presenter';
import type { EnvironmentItem } from './projects.models';

const baseEnvironment: EnvironmentItem = {
  id: 'env-1',
  projectId: 'project-1',
  name: 'Development',
  slug: 'development',
  type: 'system',
  description: null,
  status: 'Empty',
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z'
};

describe('EnvironmentCardPresenter', () => {
  it('prefers the saved environment description', () => {
    const presenter = new EnvironmentCardPresenter();

    expect(presenter.description({ ...baseEnvironment, description: 'QA for customer demos' })).toBe('QA for customer demos');
  });

  it('describes the default Development environment', () => {
    const presenter = new EnvironmentCardPresenter();

    expect(presenter.description(baseEnvironment)).toBe('Safe sandbox for local development and experiments.');
  });

  it('describes the default Staging environment', () => {
    const presenter = new EnvironmentCardPresenter();

    expect(presenter.description({ ...baseEnvironment, name: 'Staging', slug: 'staging' })).toBe('Pre-production space to validate changes before release.');
  });

  it('describes the default Production environment', () => {
    const presenter = new EnvironmentCardPresenter();

    expect(presenter.description({ ...baseEnvironment, name: 'Production', slug: 'production' })).toBe('Live environment intended for real workloads.');
  });

  it('uses a generic description for custom environments', () => {
    const presenter = new EnvironmentCardPresenter();

    expect(presenter.description({ ...baseEnvironment, name: 'QA', slug: 'qa', type: 'custom' })).toBe('Custom isolated environment for this project.');
  });
});
