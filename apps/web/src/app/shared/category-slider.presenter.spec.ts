import { describe, expect, it } from 'vitest';
import { CategorySliderPresenter } from './category-slider.presenter';

describe('CategorySliderPresenter', () => {
  it('prepends All and includes service counts for every category', () => {
    const presenter = new CategorySliderPresenter();
    const counts: Readonly<Record<string, number>> = { all: 10, ai: 3, analytics: 7 };

    expect(presenter.items('all', [{ id: 'ai', name: 'AI' }, { id: 'analytics', name: 'Analytics' }], (id) => counts[id] ?? 0)).toEqual([
      { id: 'all', label: 'All', count: 10 },
      { id: 'ai', label: 'AI', count: 3 },
      { id: 'analytics', label: 'Analytics', count: 7 }
    ]);
  });
});
