import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import type { UserListItem } from '../users/users.models';
import { UsersService } from '../users/users.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-users-page',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="users" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Users</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">The first Kiban user is the only administrator. Admin can create and delete operator accounts.</p>
      </div>

      @if (auth.user()?.role !== 'admin') {
        <div class="card p-6 text-center">
          <kiban-icon name="users" [size]="20" class="c-muted mb-2" />
          <p class="text-sm c-muted">Only the administrator can manage users.</p>
        </div>
      } @else {
        <!-- Create operator -->
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <kiban-icon name="plus" [size]="14" class="c-muted" />
            <h2 class="text-sm font-medium kb-text">Create operator</h2>
          </div>
          <form class="flex flex-col gap-3 sm:flex-row" (ngSubmit)="createOperator()">
            <input name="email" type="email" autocomplete="email" placeholder="operator@example.com" [(ngModel)]="email" class="input flex-1" required />
            <input name="password" type="password" autocomplete="new-password" placeholder="Temporary password" [(ngModel)]="password" class="input flex-1" required minlength="8" />
            <button type="submit" class="btn-primary btn gap-1.5 shrink-0" [disabled]="loading()">
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
                <button type="button" class="btn-danger btn gap-1 text-xs" [disabled]="user.role === 'admin' || deleting() === user.id" (click)="deleteUser(user)">
                  @if (deleting() === user.id) {
                    <span>Deleting…</span>
                  } @else {
                    <kiban-icon name="trash" [size]="12" />
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
      }
    </div>
  `
})
export class UsersPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<readonly UserListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly deleting = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected email = '';
  protected password = '';

  public constructor() {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.usersService.listUsers().subscribe({ next: (users) => this.users.set(users), error: () => undefined });
  }

  protected createOperator(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.message.set(null);
    this.usersService.createOperator({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.email = '';
        this.password = '';
        this.loading.set(false);
        this.message.set('Operator created.');
        this.loadUsers();
      },
      error: () => {
        this.loading.set(false);
        this.message.set('Could not create operator.');
      }
    });
  }

  protected deleteUser(user: UserListItem): void {
    if (user.role === 'admin' || this.deleting()) {
      return;
    }
    this.deleting.set(user.id);
    this.message.set(null);
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.message.set('Operator deleted.');
        this.loadUsers();
      },
      error: () => {
        this.deleting.set(null);
        this.message.set('Could not delete operator.');
      }
    });
  }
}
