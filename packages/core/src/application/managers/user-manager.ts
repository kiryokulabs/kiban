import { CannotDeleteAdminUserError, ForbiddenUserActionError, UserNotFoundError } from '../../domain/users/user-errors.js';
import type { PublicUser, User } from '../../domain/users/user.js';
import type { PasswordHasher } from '../interfaces/password-hasher.js';
import type { UserRepository } from '../interfaces/user-repository.js';

export interface CreateOperatorInput { readonly email: string; readonly password: string; }

/** Coordinates user administration use cases without depending on HTTP or persistence technology. */
export class UserManager {
  public constructor(private readonly users: UserRepository, private readonly passwordHasher: PasswordHasher) {}

  /** Lists all users when requested by the single administrator. */
  public async listUsers(actor: User): Promise<readonly PublicUser[]> {
    this.assertAdmin(actor);
    const users = await this.users.list();
    return users.map((user) => this.toPublicUser(user));
  }

  /** Creates an operator account. Only the administrator can create users. */
  public async createOperator(actor: User, input: CreateOperatorInput): Promise<PublicUser> {
    this.assertAdmin(actor);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.createOperator({ email: input.email.trim().toLowerCase(), passwordHash });
    return this.toPublicUser(user);
  }

  /** Deletes an operator account. The administrator account can never be deleted. */
  public async deleteUser(actor: User, userId: string): Promise<void> {
    this.assertAdmin(actor);
    const target = await this.users.findById(userId);
    if (!target) {
      throw new UserNotFoundError();
    }
    if (target.role === 'admin') {
      throw new CannotDeleteAdminUserError();
    }
    await this.users.deleteById(target.id);
  }

  private assertAdmin(actor: User): void {
    if (actor.role !== 'admin') {
      throw new ForbiddenUserActionError();
    }
  }

  private toPublicUser(user: User): PublicUser {
    return { id: user.id, email: user.email, role: user.role };
  }
}
