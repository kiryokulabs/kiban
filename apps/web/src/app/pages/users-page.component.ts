import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import type { UserListItem } from '../users/users.models';
import { UsersService } from '../users/users.service';

@Component({
  selector: 'kiban-users-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-5xl">
      <h1 class="text-3xl font-semibold tracking-tight">Users</h1>
      <p class="mt-3 text-zinc-400">The first Kiban user is the only administrator. Admin can create and delete operator accounts.</p>

      @if (auth.user()?.role !== 'admin') {
        <div class="mt-8 rounded-xl border border-line bg-panel p-8 text-zinc-400">Only the administrator can manage users.</div>
      } @else {
        <section class="mt-8 rounded-xl border border-line bg-panel p-6">
          <h2 class="text-lg font-medium">Create operator</h2>
          <form class="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]" (ngSubmit)="createOperator()">
            <input name="email" type="email" autocomplete="email" placeholder="operator@example.com" [(ngModel)]="email" class="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" required />
            <input name="password" type="password" autocomplete="new-password" placeholder="Temporary password" [(ngModel)]="password" class="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" required minlength="8" />
            <button type="submit" class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60" [disabled]="loading()">Create</button>
          </form>
          @if (message()) {
            <p class="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-300">{{ message() }}</p>
          }
        </section>

        <section class="mt-6 overflow-hidden rounded-xl border border-line bg-panel">
          <div class="border-b border-line px-6 py-4"><h2 class="font-medium">Accounts</h2></div>
          <div class="divide-y divide-line">
            @for (user of users(); track user.id) {
              <div class="flex items-center justify-between px-6 py-4">
                <div>
                  <p class="font-medium">{{ user.email }}</p>
                  <p class="mt-1 text-xs uppercase tracking-wide text-zinc-500">{{ user.role }}</p>
                </div>
                <button type="button" class="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-40" [disabled]="user.role === 'admin' || deleting() === user.id" (click)="deleteUser(user)">
                  {{ deleting() === user.id ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
            } @empty {
              <div class="px-6 py-10 text-center text-zinc-500">No users found.</div>
            }
          </div>
        </section>
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

  /** Loads user accounts for admin view. */
  protected loadUsers(): void {
    this.usersService.listUsers().subscribe({ next: (users) => this.users.set(users), error: () => undefined });
  }

  /** Creates an operator account. */
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

  /** Deletes an operator account; admin deletion is blocked by UI and API. */
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
