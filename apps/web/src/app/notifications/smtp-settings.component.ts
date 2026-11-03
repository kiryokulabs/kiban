import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { IconsComponent } from '../shared/icons.component';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SmtpSettingsApiService, type SmtpSecurity, type SmtpSettingsView } from './smtp-settings-api.service';

/** Email notification channel; only administrators may edit or send test messages. */
@Component({
  selector: 'kiban-smtp-settings',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <section class="card p-5">
      <div class="flex items-center gap-3">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
          <kiban-icon name="mail" [size]="16" />
        </div>
        <div>
          <h2 class="text-sm font-medium kb-text">Email (SMTP)</h2>
          <p class="text-xs c-muted">Configure the email channel used to send mail from Kiban.</p>
        </div>
      </div>
      @if (loading()) {
        <p class="mt-4 text-sm c-muted">Loading SMTP settings...</p>
      } @else {
        <form class="mt-4 space-y-4" (ngSubmit)="save()">
          <fieldset class="grid gap-3 sm:grid-cols-2" [disabled]="!canEdit() || saving() || testing()">
            <label class="block text-xs">
              <span class="mb-1.5 block c-muted">SMTP host</span>
              <input name="smtpHost" class="input" [(ngModel)]="host" placeholder="smtp.example.com" required maxlength="253" [disabled]="saving() || testing()" />
            </label>
            <label class="block text-xs">
              <span class="mb-1.5 block c-muted">Port</span>
              <input name="smtpPort" type="number" class="input" [(ngModel)]="port" min="1" max="65535" required [disabled]="saving() || testing()" />
            </label>
            <label class="block text-xs sm:col-span-2">
              <span class="mb-1.5 block c-muted">Connection security</span>
              <select name="smtpSecurity" class="input" [(ngModel)]="security" [disabled]="saving() || testing()">
                <option value="starttls">STARTTLS (usually port 587)</option>
                <option value="tls">TLS (usually port 465)</option>
                <option value="none">None (no encryption)</option>
              </select>
            </label>
            <label class="block text-xs">
              <span class="mb-1.5 block c-muted">Username (optional)</span>
              <input name="smtpUsername" class="input" [(ngModel)]="username" autocomplete="off" maxlength="320" [disabled]="saving() || testing()" />
            </label>
            @if (canEdit()) {
              <label class="block text-xs">
                <span class="mb-1.5 block c-muted">Password</span>
                <input name="smtpPassword" type="password" class="input" [(ngModel)]="password" autocomplete="new-password" [placeholder]="hasPassword() ? 'Leave blank to keep saved password' : 'SMTP password'" [disabled]="saving() || testing()" />
              </label>
            } @else {
              <p class="self-center text-xs c-muted">Password: {{ hasPassword() ? 'Configured' : 'Not configured' }}</p>
            }
            <label class="block text-xs">
              <span class="mb-1.5 block c-muted">Sender name</span>
              <input name="smtpFromName" class="input" [(ngModel)]="fromName" maxlength="100" [disabled]="saving() || testing()" />
            </label>
            <label class="block text-xs">
              <span class="mb-1.5 block c-muted">Sender email</span>
              <input name="smtpFromEmail" type="email" class="input" [(ngModel)]="fromEmail" required maxlength="254" [disabled]="saving() || testing()" />
            </label>
          </fieldset>
          @if (canEdit()) {
            <p class="text-xs c-muted">Leave the username empty for an unauthenticated relay. Authentication requires TLS or STARTTLS.</p>
            <div class="flex flex-wrap gap-2">
              <button class="btn-primary btn" type="submit" [disabled]="saving() || testing()">{{ saving() ? 'Saving...' : 'Save SMTP settings' }}</button>
              <button class="btn-secondary btn" type="button" (click)="sendTest()" [disabled]="!configured() || saving() || testing()">{{ testing() ? 'Sending...' : 'Send test email' }}</button>
            </div>
            <p class="text-xs c-muted">The test uses saved settings and sends only to your administrator email address. Save any changes first.</p>
          } @else {
            <p class="text-xs c-muted">Only administrators can change notification settings.</p>
          }
        </form>
      }
      @if (error()) { <p class="mt-3 text-xs text-red-500" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="mt-3 text-xs text-green-500" role="status">{{ message() }}</p> }
    </section>
  `
})
export class SmtpSettingsComponent {
  private readonly api = inject(SmtpSettingsApiService);
  private readonly auth = inject(AuthService);
  public readonly canEdit = computed(() => this.auth.user()?.role === 'admin');
  public readonly loading = signal(true);
  public readonly saving = signal(false);
  public readonly testing = signal(false);
  public readonly configured = signal(false);
  public readonly hasPassword = signal(false);
  public readonly error = signal('');
  public readonly message = signal('');
  public host = '';
  public port = 587;
  public security: SmtpSecurity = 'starttls';
  public username = '';
  public password = '';
  public fromName = 'Kiban';
  public fromEmail = '';

  public constructor() {
    this.api.get().subscribe({
      next: (settings) => { if (settings) this.apply(settings); this.loading.set(false); },
      error: (error: unknown) => { this.error.set(this.errorMessage(error, 'Could not load SMTP settings.')); this.loading.set(false); }
    });
  }

  public save(): void {
    if (!this.canEdit() || this.loading() || this.saving() || this.testing()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.api.save({ host: this.host, port: this.port, security: this.security, username: this.username, fromName: this.fromName, fromEmail: this.fromEmail, ...(this.password ? { password: this.password } : {}) }).subscribe({
      next: (settings) => { this.apply(settings); this.password = ''; this.saving.set(false); this.message.set('SMTP settings saved.'); },
      error: (error: unknown) => { this.saving.set(false); this.error.set(this.errorMessage(error, 'Could not save SMTP settings.')); }
    });
  }

  public sendTest(): void {
    if (!this.canEdit() || !this.configured() || this.loading() || this.saving() || this.testing()) return;
    this.testing.set(true);
    this.error.set('');
    this.message.set('');
    this.api.sendTest().subscribe({
      next: () => { this.testing.set(false); this.message.set('The SMTP server accepted the test email for your administrator address. Check your inbox and spam folder.'); },
      error: (error: unknown) => { this.testing.set(false); this.error.set(this.errorMessage(error, 'Could not send the test email.')); }
    });
  }

  private apply(settings: SmtpSettingsView): void {
    this.host = settings.host;
    this.port = settings.port;
    this.security = settings.security;
    this.username = settings.username;
    this.fromName = settings.fromName;
    this.fromEmail = settings.fromEmail;
    this.hasPassword.set(settings.hasPassword);
    this.configured.set(true);
  }

  private errorMessage(error: unknown, fallback: string): string {
    const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
    return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : fallback;
  }
}
