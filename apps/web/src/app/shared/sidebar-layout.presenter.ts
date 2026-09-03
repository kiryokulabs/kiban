export type SidebarDisplayMode = 'desktop' | 'mobile';

export class SidebarLayoutPresenter {
  public asideClass(mode: SidebarDisplayMode): string {
    const baseClass = 'z-sticky flex flex-col border-r kb-border';

    if (mode === 'mobile') {
      return `relative h-full w-full ${baseClass}`;
    }

    return `fixed inset-y-0 left-0 hidden md:flex ${baseClass}`;
  }

  public width(mode: SidebarDisplayMode, collapsed: boolean): string {
    if (mode === 'mobile') {
      return '100%';
    }

    return collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';
  }

  public canCollapse(mode: SidebarDisplayMode): boolean {
    return mode === 'desktop';
  }
}
