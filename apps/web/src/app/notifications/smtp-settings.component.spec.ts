import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { SmtpSettingsComponent } from './smtp-settings.component';
import { SmtpSettingsApiService } from './smtp-settings-api.service';

// These tests exercise form behavior, not rendering of the shared icon component.
vi.mock('../shared/icons.component', () => ({ IconsComponent: class {} }));

const view = { host: 'smtp.example.com', port: 587, security: 'starttls' as const, username: 'smtp-user', hasPassword: true, fromName: 'Kiban', fromEmail: 'kiban@example.com' };
const createComponent = (response: typeof view | null = view, role: 'admin' | 'operator' = 'admin') => {
  const api = { get: vi.fn(() => of(response)), save: vi.fn(() => of(view)), sendTest: vi.fn(() => of(undefined)) };
  const injector = Injector.create({ providers: [{ provide: SmtpSettingsApiService, useValue: api }, { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'user@example.com', role }) } }] });
  return { component: runInInjectionContext(injector, () => new SmtpSettingsComponent()), api };
};

describe('SMTP settings form', () => {
  it('lets operators read the configuration but never save or send tests', () => {
    const { component, api } = createComponent(view, 'operator');
    expect(component.host).toBe(view.host);
    expect(component.canEdit()).toBe(false);
    expect(component.password).toBe('');
    component.save();
    component.sendTest();
    expect(api.save).not.toHaveBeenCalled();
    expect(api.sendTest).not.toHaveBeenCalled();
  });

  it('loads a safe view while leaving the saved password field empty', () => {
    const { component } = createComponent();
    expect(component.host).toBe(view.host);
    expect(component.hasPassword()).toBe(true);
    expect(component.password).toBe('');
    expect(component.configured()).toBe(true);
  });

  it('omits a blank password when saving so it does not overwrite stored credentials', () => {
    const { component, api } = createComponent();
    component.save();
    expect(api.save).toHaveBeenCalledWith({ host: view.host, port: view.port, security: view.security, username: view.username, fromName: view.fromName, fromEmail: view.fromEmail });
    expect(component.password).toBe('');
  });

  it('sends a new password without trimming it and clears it after success', () => {
    const { component, api } = createComponent();
    component.password = ' new-secret ';
    component.save();
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ password: ' new-secret ' }));
    expect(component.password).toBe('');
  });

  it('sends a test using saved settings and without selecting a recipient', () => {
    const { component, api } = createComponent();
    component.sendTest();
    expect(api.sendTest).toHaveBeenCalledWith();
    expect(component.message()).toContain('accepted');
  });

  it('does not send before configuration and prevents duplicate in-flight tests', () => {
    const { component, api } = createComponent(null);
    component.sendTest();
    expect(api.sendTest).not.toHaveBeenCalled();
    component.configured.set(true);
    const pending = new Subject<undefined>();
    api.sendTest.mockImplementation(() => pending);
    component.sendTest();
    component.sendTest();
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    pending.next(undefined);
    pending.complete();
    expect(component.testing()).toBe(false);
  });

  it('shows a failed send instead of a success message', () => {
    const { component, api } = createComponent();
    api.sendTest.mockImplementation(() => throwError(() => new Error('failed')));
    component.sendTest();
    expect(component.error()).toBeTruthy();
    expect(component.message()).toBe('');
    expect(component.testing()).toBe(false);
  });
});
