import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export const MOBILE_MEDIA_QUERY = '(max-width: 767.98px)';

export class ViewportPresenter {
  public isMobile(matchesMobileQuery: boolean): boolean {
    return matchesMobileQuery;
  }
}

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly presenter = new ViewportPresenter();
  private readonly mobile = signal(this.currentMobileState());

  public readonly isMobile = computed(() => this.mobile());

  public constructor() {
    const mediaQueryList = this.mobileMediaQueryList();

    if (mediaQueryList === null) {
      return;
    }

    this.mobile.set(this.presenter.isMobile(mediaQueryList.matches));

    const updateMobileState = (event: MediaQueryListEvent): void => {
      this.mobile.set(this.presenter.isMobile(event.matches));
    };

    mediaQueryList.addEventListener('change', updateMobileState);
    this.destroyRef.onDestroy(() => mediaQueryList.removeEventListener('change', updateMobileState));
  }

  private currentMobileState(): boolean {
    return this.presenter.isMobile(this.mobileMediaQueryList()?.matches ?? false);
  }

  private mobileMediaQueryList(): MediaQueryList | null {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY);
  }
}
