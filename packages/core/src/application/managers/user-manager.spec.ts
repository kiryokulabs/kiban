import { describe, expect, it, vi } from 'vitest';
import { CannotDeleteAdminUserError, ForbiddenUserActionError } from '../../domain/users/user-errors.js';
import type { User } from '../../domain/users/user.js';
import type { PasswordHasher } from '../interfaces/password-hasher.js';
import type { UserRepository } from '../interfaces/user-repository.js';
import { UserManager } from './user-manager.js';

const admin: User = { id: 'admin-1', email: 'admin@example.com', passwordHash: 'hash', role: 'admin', createdAt: new Date(), updatedAt: new Date() };
const operator: User = { id: 'operator-1', email: 'operator@example.com', passwordHash: 'hash', role: 'operator', createdAt: new Date(), updatedAt: new Date() };

const createRepository = (): UserRepository => {
  const users = new Map<string, User>([[admin.id, admin], [operator.id, operator]]);
  return {
    adminExists: vi.fn(async () => true),
    createAdmin: vi.fn(async () => admin),
    createOperator: vi.fn(async (input) => {
      const user: User = { id: 'operator-2', email: input.email, passwordHash: input.passwordHash, role: 'operator', createdAt: new Date(), updatedAt: new Date() };
      users.set(user.id, user);
      return user;
    }),
    list: vi.fn(async () => [...users.values()]),
    deleteById: vi.fn(async (id: string) => { users.delete(id); }),
    findByEmail: vi.fn(async (email: string) => [...users.values()].find((user) => user.email === email) ?? null),
    findById: vi.fn(async (id: string) => users.get(id) ?? null),
    updatePasswordHash: vi.fn(async () => undefined)
  };
};

const passwordHasher: PasswordHasher = {
  hash: vi.fn(async (password: string) => `hash:${password}`),
  verify: vi.fn(async () => true)
};

describe('UserManager', () => {
  it('allows admin to list users without password hashes', async () => {
    const manager = new UserManager(createRepository(), passwordHasher);
    await expect(manager.listUsers(admin)).resolves.toEqual([
      { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      { id: 'operator-1', email: 'operator@example.com', role: 'operator' }
    ]);
  });

  it('prevents operator from listing users', async () => {
    const manager = new UserManager(createRepository(), passwordHasher);
    await expect(manager.listUsers(operator)).rejects.toBeInstanceOf(ForbiddenUserActionError);
  });

  it('allows admin to create an operator', async () => {
    const repository = createRepository();
    const manager = new UserManager(repository, passwordHasher);
    await expect(manager.createOperator(admin, { email: ' New@Example.COM ', password: 'password123' })).resolves.toEqual({ id: 'operator-2', email: 'new@example.com', role: 'operator' });
    expect(repository.createOperator).toHaveBeenCalledWith({ email: 'new@example.com', passwordHash: 'hash:password123' });
  });

  it('prevents deleting the admin account', async () => {
    const manager = new UserManager(createRepository(), passwordHasher);
    await expect(manager.deleteUser(admin, admin.id)).rejects.toBeInstanceOf(CannotDeleteAdminUserError);
  });

  it('allows admin to delete an operator', async () => {
    const repository = createRepository();
    const manager = new UserManager(repository, passwordHasher);
    await manager.deleteUser(admin, operator.id);
    expect(repository.deleteById).toHaveBeenCalledWith(operator.id);
  });
});
