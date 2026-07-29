import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthManager, CannotDeleteAdminUserError, ForbiddenUserActionError, InvalidCredentialsError, UnauthenticatedError, UserManager, UserNotFoundError } from '@kiban/core';
import { AUTH_MANAGER } from '../../auth/interfaces/auth.constants';
import type { CreateOperatorDto, UserDto } from '../dto/users.dto';
import { USER_MANAGER } from '../interfaces/users.constants';
import { mapPublicUserToDto } from '../mappers/users.mapper';

@Injectable()
export class UsersService {
  public constructor(@Inject(AUTH_MANAGER) private readonly auth: AuthManager, @Inject(USER_MANAGER) private readonly users: UserManager) {}

  /** Lists users visible to the administrator. */
  public async listUsers(token: string | undefined): Promise<readonly UserDto[]> {
    const actor = await this.authenticate(token);
    try {
      const users = await this.users.listUsers(actor);
      return users.map(mapPublicUserToDto);
    } catch (error: unknown) {
      this.mapUserManagementError(error);
    }
  }

  /** Creates an operator account. */
  public async createOperator(token: string | undefined, dto: CreateOperatorDto): Promise<UserDto> {
    this.assertCreateOperatorDto(dto);
    const actor = await this.authenticate(token);
    try {
      const user = await this.users.createOperator(actor, dto);
      return mapPublicUserToDto(user);
    } catch (error: unknown) {
      this.mapUserManagementError(error);
    }
  }

  /** Deletes an operator account. */
  public async deleteUser(token: string | undefined, userId: string): Promise<void> {
    const actor = await this.authenticate(token);
    try {
      await this.users.deleteUser(actor, userId);
    } catch (error: unknown) {
      this.mapUserManagementError(error);
    }
  }

  private async authenticate(token: string | undefined) {
    try {
      const session = await this.auth.authenticate(token ?? null);
      return session.user;
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedError || error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  private assertCreateOperatorDto(dto: CreateOperatorDto): void {
    if (!dto.email.includes('@')) {
      throw new BadRequestException('A valid email is required.');
    }
    if (dto.password.length < 8) {
      throw new BadRequestException('A password of at least 8 characters is required.');
    }
  }

  private mapUserManagementError(error: unknown): never {
    if (error instanceof ForbiddenUserActionError || error instanceof CannotDeleteAdminUserError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof UserNotFoundError) {
      throw new NotFoundException(error.message);
    }
    throw error;
  }
}
