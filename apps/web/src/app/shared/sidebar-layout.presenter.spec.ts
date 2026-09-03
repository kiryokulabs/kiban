import { describe, expect, it } from 'vitest';
import { SidebarLayoutPresenter, type SidebarDisplayMode } from './sidebar-layout.presenter';

describe('SidebarLayoutPresenter', () => {
  const presenter = new SidebarLayoutPresenter();

  it('keeps the desktop sidebar fixed and unavailable on mobile breakpoints', () => {
    const className = presenter.asideClass('desktop');

    expect(className).toContain('hidden');
    expect(className).toContain('md:flex');
    expect(className).toContain('fixed');
  });

  it('keeps the mobile sidebar inside its overlay instead of fixed to the app shell', () => {
    const className = presenter.asideClass('mobile');

    expect(className).toContain('relative');
    expect(className).toContain('h-full');
    expect(className).toContain('w-full');
    expect(className).not.toContain('fixed');
    expect(className).not.toContain('inset-y-0');
  });

  it('uses responsive width only for the desktop sidebar', () => {
    expect(presenter.width('desktop', true)).toBe('var(--sidebar-collapsed-width)');
    expect(presenter.width('desktop', false)).toBe('var(--sidebar-width)');
  });

  it('uses full overlay width for the mobile sidebar regardless of collapse state', () => {
    const modes: readonly SidebarDisplayMode[] = ['mobile'];

    for (const mode of modes) {
      expect(presenter.width(mode, true)).toBe('100%');
      expect(presenter.width(mode, false)).toBe('100%');
    }
  });

  it('allows collapse controls only for the desktop sidebar', () => {
    expect(presenter.canCollapse('desktop')).toBe(true);
    expect(presenter.canCollapse('mobile')).toBe(false);
  });
});
