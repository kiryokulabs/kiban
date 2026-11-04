import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import type { UserListItem, UserLoginActivity } from '../users/users.models';
import { UsersService } from '../users/users.service';
import { IconsComponent } from '../shared/icons.component';
import { ToastService } from '../shared/toast.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';

@Component({
  selector: 'kiban-users-page',
  standalone: true,
  imports: [FormsModule, IconsComponent, ConfirmModalComponent, DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="users" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Users</h1>
        </div>
        <p class="mt-4 text-sm c-muted">The first Kiban user is the only administrator. Admin can create and delete operator accounts.</p>
      </div>

      @if (auth.user()?.role !== 'admin') {
        <div class="card p-6 text-center">
          <kiban-icon name="users" [size]="20" class="c-muted mb-2" />
          <p class="text-sm c-muted">Only the administrator can manage users.</p>
        </div>
      } @else {
        <div class="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
        <div class="min-w-0 space-y-6">
        <!-- Create operator -->
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <kiban-icon name="plus" [size]="14" class="c-muted" />
            <h2 class="text-sm font-medium kb-text">Create operator</h2>
          </div>
          <form class="flex flex-col gap-3 sm:flex-row" (ngSubmit)="createOperator()">
            <label class="flex-1 text-xs">
              <span class="mb-1.5 block c-muted">Email</span>
              <input name="email" type="email" autocomplete="email" placeholder="operator@example.com" [(ngModel)]="email" class="input" required />
            </label>
            <label class="flex-1 text-xs">
              <span class="mb-1.5 block c-muted">Password</span>
              <input name="password" type="password" autocomplete="new-password" placeholder="Temporary password" [(ngModel)]="password" class="input" required minlength="8" />
            </label>
            <button type="submit" class="btn-primary btn gap-1.5 shrink-0 sm:self-end" [disabled]="loading() || !email.trim() || !password">
              <kiban-icon name="plus" [size]="14" />
              Create
            </button>
          </form>
          @if (message()) {
            <div class="card-subtle flex items-center gap-2.5 px-4 py-3 mt-3">
              <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
              <p class="text-sm c-muted">{{ message() }}</p>
            </div>
          }
        </div>

        <!-- Accounts list -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b kb-border">
            <div class="flex items-center gap-2">
              <kiban-icon name="users" [size]="14" class="c-muted" />
              <h2 class="text-sm font-medium kb-text">Accounts</h2>
            </div>
          </div>
          <div class="divide-y kb-border">
            @for (user of users(); track user.id) {
              <div class="flex items-center justify-between px-5 py-3.5 hover:bg-hover/30 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand/10 text-brand-light text-[11px] font-medium">
                    {{ user.email.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium kb-text truncate">{{ user.email }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="badge text-[9px] px-1 py-0.5 leading-none">{{ user.role }}</span>
                    </div>
                  </div>
                </div>
                <button type="button" class="btn-danger btn gap-1 text-xs" [disabled]="user.role === 'admin' || deleting() === user.id" (click)="requestDeleteUser(user)">
                  @if (deleting() === user.id) {
                    <span>Deleting…</span>
                  } @else {
                    <kiban-icon name="trash" [size]="12" style="color: var(--color-danger);" />
                    <span class="hidden sm:inline">Delete</span>
                  }
                </button>
              </div>
            } @empty {
              <div class="px-5 py-10 text-center">
                <p class="text-xs c-muted">No users found.</p>
              </div>
            }
          </div>
        </div>
        </div>
        <section class="card min-w-0 overflow-hidden" aria-labelledby="login-activity-heading">
          <div class="flex items-center gap-2 border-b kb-border px-5 py-3">
            <kiban-icon name="activity" [size]="14" class="c-muted" />
            <h2 id="login-activity-heading" class="text-sm font-medium kb-text">Login activity</h2>
          </div>
          @if (activityLoading()) {
            <p class="px-5 py-4 text-xs c-muted" role="status">Loading login activity...</p>
          } @else if (activityError()) {
            <p class="px-5 py-4 text-xs text-red-500" role="alert">Could not load login activity. Reload the page to try again.</p>
          } @else {
            <div class="divide-y kb-border">
              @for (user of users(); track user.id) {
                @let login = activity().get(user.id);
                <div class="space-y-3 px-5 py-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="min-w-0 break-all text-sm font-medium kb-text">{{ user.email }}</p>
                    <span class="badge text-[9px] px-1 py-0.5 leading-none">{{ user.role }}</span>
                  </div>
                  @if (login) {
                    <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                      <dt class="c-muted">Last login</dt>
                      <dd class="kb-text">{{ login.lastLoginAt ? (login.lastLoginAt | date:'medium') : 'Not recorded' }}</dd>
                      <dt class="c-muted">Login IP</dt>
                      <dd class="break-all font-mono kb-text">{{ login.lastLoginIp ?? 'Not recorded' }}</dd>
                      <dt class="c-muted">Active sessions</dt>
                      <dd class="kb-text">{{ login.activeSessions }}</dd>
                    </dl>
                    @if (login.currentSession; as session) {
                      <div class="card-subtle space-y-2 p-3">
                        <p class="text-xs font-medium text-brand-light">Current session</p>
                        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                          <dt class="c-muted">Started</dt>
                          <dd class="kb-text">{{ session.createdAt | date:'medium' }}</dd>
                          <dt class="c-muted">Expires</dt>
                          <dd class="kb-text">{{ session.expiresAt | date:'medium' }}</dd>
                          <dt class="c-muted">Login IP</dt>
                          <dd class="break-all font-mono kb-text">{{ session.ipAddress ?? 'Not recorded' }}</dd>
                        </dl>
                      </div>
                    }
                  } @else {
                    <p class="text-xs c-muted">Not recorded</p>
                  }
                </div>
              } @empty {
                <p class="px-5 py-4 text-xs c-muted">No users found.</p>
              }
            </div>
            <p class="border-t kb-border px-5 py-3 text-xs c-muted">Active sessions are unexpired and not revoked; they do not indicate whether a user is online. IP addresses are recorded for new logins only.</p>
          }
        </section>
        </div>
      }

      @if (userPendingDelete(); as user) {
        <kiban-confirm-modal
          title="Delete user"
          [message]="'Delete user &quot;' + user.email + '&quot;? This cannot be undone.'"
          confirmLabel="Delete user"
          [destructive]="true"
          (cancel)="cancelDeleteUser()"
          (confirm)="confirmDeleteUser()"
        />
      }
    </div>
  `
})
export class UsersPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly notifications = inject(ToastService);

  protected readonly users = signal<readonly UserListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly activity = signal<ReadonlyMap<string, UserLoginActivity>>(new Map());
  protected readonly activityLoading = signal(true);
  protected readonly activityError = signal(false);
  protected readonly deleting = signal<string | null>(null);
  protected readonly userPendingDelete = signal<UserListItem | null>(null);
  protected readonly message = signal<string | null>(null);

  protected email = '';
  protected password = '';

  public constructor() {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.activityLoading.set(true);
    this.activityError.set(false);
    this.usersService.listActivity().subscribe({
      next: activity => { this.activity.set(new Map(activity.map(row => [row.userId, row]))); this.activityLoading.set(false); },
      error: () => { this.activity.set(new Map()); this.activityError.set(true); this.activityLoading.set(false); }
    });
    this.usersService.listUsers().subscribe({ next: (users) => this.users.set(users), error: () => undefined });
  }

  protected createOperator(): void {
    if (this.loading()) {
      return;
    }
    const email = this.email;
    this.loading.set(true);
    this.message.set(null);
    this.usersService.createOperator({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.email = '';
        this.password = '';
        this.loading.set(false);
        this.notifications.success(`${email} created successfully.`);
        this.loadUsers();
      },
      error: () => {
        this.loading.set(false);
        this.notifications.error(`Could not create ${email}.`);
      }
    });
  }

  protected requestDeleteUser(user: UserListItem): void {
    if (user.role !== 'admin') this.userPendingDelete.set(user);
  }

  protected cancelDeleteUser(): void {
    this.userPendingDelete.set(null);
  }

  protected confirmDeleteUser(): void {
    const user = this.userPendingDelete();
    if (!user || user.role === 'admin' || this.deleting()) {
      return;
    }
    this.deleting.set(user.id);
    this.message.set(null);
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.userPendingDelete.set(null);
        this.notifications.success(`${user.email} deleted successfully.`);
        this.loadUsers();
      },
      error: () => {
        this.deleting.set(null);
        this.notifications.error(`Could not delete ${user.email}.`);
      }
    });
  }
}
