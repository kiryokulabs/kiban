import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string => readFileSync(resolve(process.cwd(), 'src/app', file), 'utf8');

describe('Notifications page', () => {
  it('shows a mail icon beside the SMTP card heading using the Kiban card style', () => {
    expect(read('notifications/smtp-settings.component.ts')).toContain('grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light');
    expect(read('notifications/smtp-settings.component.ts')).toContain('<kiban-icon name="mail" [size]="16" />');
    expect(read('shared/icons.component.ts')).toContain("@case ('mail')");
  });

  it('has its own lazy route and a sidebar entry visible to all users', () => {
    expect(read('app.routes.ts')).toMatch(/path: 'notifications', loadComponent:/);
    expect(read('app.component.ts')).toContain("{ label: 'Notifications', path: '/notifications', icon: 'bell' }");
  });

  it('hosts the Email channel outside Settings without implementing future channels', () => {
    const page = read('pages/notifications-page.component.ts');
    expect(page).toContain('Notifications</h1>');
    expect(page).toContain('<kiban-smtp-settings />');
    expect(page).not.toContain('adminOnly');
    expect(read('pages/settings-page.component.ts')).not.toContain('kiban-smtp-settings');
  });

  it('disables editing and hides write actions and password entry for operators', () => {
    const form = read('notifications/smtp-settings.component.ts');
    expect(form).toContain('[disabled]="!canEdit() || saving() || testing()"');
    expect(form).toContain('@if (canEdit())');
    expect(form).toContain('Only administrators can change notification settings.');
  });
});
