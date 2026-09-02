import { describe, expect, it } from 'vitest';
import { MOBILE_MEDIA_QUERY, ViewportPresenter } from './viewport.service';

describe('ViewportPresenter', () => {
  const presenter = new ViewportPresenter();

  it('uses the Tailwind md breakpoint as the mobile boundary', () => {
    expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 767.98px)');
  });

  it('reads mobile state from media query matches', () => {
    expect(presenter.isMobile(true)).toBe(true);
    expect(presenter.isMobile(false)).toBe(false);
  });
});
