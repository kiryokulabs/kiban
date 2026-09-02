import { describe, expect, it } from 'vitest';
import { AppLayoutPresenter } from './app-layout.presenter';

describe('AppLayoutPresenter', () => {
  const presenter = new AppLayoutPresenter();

  it('keeps the persistent sidebar hidden on mobile breakpoints', () => {
    expect(presenter.persistentSidebarHostClass()).toContain('hidden');
    expect(presenter.persistentSidebarHostClass()).toContain('md:block');
  });

  it('keeps the mobile sidebar overlay hidden on desktop breakpoints', () => {
    expect(presenter.mobileSidebarOverlayClass()).toContain('md:hidden');
  });

  it('moves page content only at desktop breakpoints', () => {
    expect(presenter.mainContentClass()).toContain('md:ml-[var(--sidebar-offset)]');
  });

  it('uses the expanded sidebar offset by default', () => {
    expect(presenter.sidebarOffset(false)).toBe('var(--sidebar-width)');
  });

  it('uses the collapsed sidebar offset only when desktop sidebar is collapsed', () => {
    expect(presenter.sidebarOffset(true)).toBe('var(--sidebar-collapsed-width)');
  });
});
