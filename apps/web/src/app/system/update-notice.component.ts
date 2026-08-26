import { Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError } from 'rxjs';
import { SystemVersionService, type SystemVersionInfo } from './system-version.service';
import { UpdateNoticePresenter } from './update-notice.presenter';

@Component({
  selector: 'kiban-update-notice',
  standalone: true,
  template: `
    @if (version(); as current) {
      @if (current.updateAvailable && current.latestVersion) {
        <span
          class="hidden items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-500 sm:inline-flex"
          [title]="presenter.noticeTitle(current.currentVersion, current.latestVersion)"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_currentColor]" aria-hidden="true"></span>
          {{ presenter.noticeLabel(current.latestVersion) }}
        </span>
      }
    }
  `
})
export class UpdateNoticeComponent {
  protected readonly version = signal<SystemVersionInfo | null>(null);
  protected readonly presenter = new UpdateNoticePresenter();

  public constructor(private readonly systemVersion: SystemVersionService) {
    this.systemVersion.getVersion().pipe(
      catchError(() => EMPTY),
      takeUntilDestroyed()
    ).subscribe((version) => this.version.set(version));
  }
}
