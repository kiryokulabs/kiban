import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthManager, CannotDeleteAdminUserError, ForbiddenUserActionError, UnauthenticatedError, UserManager, UserNotFoundError } from '@kiban/core';
import { UsersService } from './users.service';

const fullAdmin = { id: 'admin-1', email: 'admin@example.com', role: 'admin' as const, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };
const publicAdmin = { id: 'admin-1', email: 'admin@example.com', role: 'admin' as const };
const publicOperator = { id: 'operator-1', email: 'operator@example.com', role: 'operator' as const };

const createService = (auth: Partial<AuthManager>, users: Partial<UserManager>) => new UsersService(auth as AuthManager, users as UserManager);
const authenticatedAuth = { authenticate: vi.fn(async () => ({ user: fullAdmin, session: { id: 'session-1', userId: fullAdmin.id, tokenHash: 'hash', expiresAt: new Date(), createdAt: new Date() } })) };

describe('API UsersService', () => {
  it('lists users for authenticated admin', async () => {
    const service = createService(authenticatedAuth, { listUsers: vi.fn(async () => [publicAdmin, publicOperator]) });
    await expect(service.listUsers('token')).resolves.toEqual([publicAdmin, publicOperator]);
  });

  it('creates operator for authenticated admin', async () => {
    const createOperator = vi.fn(async () => publicOperator);
    const service = createService(authenticatedAuth, { createOperator });
    await expect(service.createOperator('token', { email: 'operator@example.com', password: 'password123' })).resolves.toEqual(publicOperator);
    expect(createOperator).toHaveBeenCalledWith(fullAdmin, { email: 'operator@example.com', password: 'password123' });
  });

  it('rejects invalid operator creation payload', async () => {
    const service = createService(authenticatedAuth, { createOperator: vi.fn() });
    await expect(service.createOperator('token', { email: 'invalid', password: 'short' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes operator for authenticated admin', async () => {
    const deleteUser = vi.fn(async () => undefined);
    const service = createService(authenticatedAuth, { deleteUser });
    await service.deleteUser('token', 'operator-1');
    expect(deleteUser).toHaveBeenCalledWith(fullAdmin, 'operator-1');
  });

  it('maps unauthenticated requests to unauthorized', async () => {
    const service = createService({ authenticate: vi.fn(async () => { throw new UnauthenticatedError(); }) }, { listUsers: vi.fn() });
    await expect(service.listUsers(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps forbidden user actions to forbidden', async () => {
    const service = createService(authenticatedAuth, { listUsers: vi.fn(async () => { throw new ForbiddenUserActionError(); }) });
    await expect(service.listUsers('token')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps admin deletion attempts to forbidden', async () => {
    const service = createService(authenticatedAuth, { deleteUser: vi.fn(async () => { throw new CannotDeleteAdminUserError(); }) });
    await expect(service.deleteUser('token', 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps missing users to not found', async () => {
    const service = createService(authenticatedAuth, { deleteUser: vi.fn(async () => { throw new UserNotFoundError(); }) });
    await expect(service.deleteUser('token', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
