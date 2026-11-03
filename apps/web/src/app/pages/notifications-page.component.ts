import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';
import { SmtpSettingsComponent } from '../notifications/smtp-settings.component';

/** Notification channels live here independently of instance and service settings. */
@Component({
  selector: 'kiban-notifications-page',
  standalone: true,
  imports: [IconsComponent, SmtpSettingsComponent],
  template: `
    <div class="space-y-6 max-w-full">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="bell" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Notifications</h1>
        </div>
        <p class="my-4 text-sm c-muted">Manage notification channels for this Kiban instance.</p>
      </div>
      <kiban-smtp-settings />
    </div>
  `
})
export class NotificationsPageComponent {}
