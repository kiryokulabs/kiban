export class AppLayoutPresenter {
  public persistentSidebarHostClass(): string {
    return 'hidden md:block';
  }

  public mobileSidebarOverlayClass(): string {
    return 'fixed inset-0 z-[450] bg-black/60 md:hidden';
  }

  public mainContentClass(): string {
    return 'app-shell-content flex min-h-screen min-w-0 flex-col transition-all duration-200 md:ml-[var(--sidebar-offset)]';
  }

  public sidebarOffset(collapsed: boolean): string {
    return collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';
  }
}
