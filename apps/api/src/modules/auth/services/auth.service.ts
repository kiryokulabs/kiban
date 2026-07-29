import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminRegistrationClosedError, AuthManager, InvalidCredentialsError, UnauthenticatedError } from '@kiban/core';
import type { AuthResponseDto, BootstrapStatusDto, LoginDto, RegisterAdminDto } from '../dto/auth.dto';
import { AUTH_MANAGER } from '../interfaces/auth.constants';
import { mapUserToAuthUserDto } from '../mappers/auth.mapper';

@Injectable()
export class AuthService {
  public constructor(@Inject(AUTH_MANAGER) private readonly auth: AuthManager) {}

  /** Returns whether the UI should display initial admin setup. */
  public bootstrapStatus(): Promise<BootstrapStatusDto> {
    return this.auth.getBootstrapStatus();
  }

  /** Registers the first admin account when bootstrap is still open. */
  public async registerAdmin(dto: RegisterAdminDto): Promise<AuthResponseDto> {
    this.assertCredentialsShape(dto.email, dto.password);
    try {
      const user = await this.auth.registerInitialAdmin(dto);
      return { user: mapUserToAuthUserDto(user) };
    } catch (error: unknown) {
      if (error instanceof AdminRegistrationClosedError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /** Authenticates credentials and returns an opaque session token for cookie transport. */
  public async login(dto: LoginDto): Promise<{ readonly token: string; readonly expiresAt: Date; readonly response: AuthResponseDto }> {
    this.assertCredentialsShape(dto.email, dto.password);
    try {
      const result = await this.auth.login(dto);
      return { token: result.token, expiresAt: result.expiresAt, response: { user: mapUserToAuthUserDto(result.user) } };
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  /** Revokes the current session token. */
  public async logout(token: string | undefined): Promise<void> {
    if (token) {
      await this.auth.logout(token);
    }
  }

  /** Returns the current authenticated user. */
  public async me(token: string | undefined): Promise<AuthResponseDto> {
    try {
      const session = await this.auth.authenticate(token ?? null);
      return { user: mapUserToAuthUserDto(session.user) };
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  private assertCredentialsShape(email: string, password: string): void {
    if (!email.includes('@') || password.length < 8) {
      throw new BadRequestException('A valid email and a password of at least 8 characters are required.');
    }
  }
}
