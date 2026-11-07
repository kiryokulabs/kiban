import { isIP } from 'node:net';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminRegistrationClosedError, AuthManager, InvalidCredentialsError, UnauthenticatedError } from '@kiban/core';
import type { AuthenticatedSession } from '@kiban/core';
import type { AuthResponseDto, BootstrapStatusDto } from '../dto/auth.dto';
import { AUTH_MANAGER } from '../interfaces/auth.constants';
import { mapUserToAuthUserDto } from '../mappers/auth.mapper';
import { parseCredentials, parsePasswordChange } from './auth-validation';
import { LoginRateLimiter } from './login-rate-limiter';

/** Backend-only revocation notifications for active transports. Never sent to browsers. */
export interface SessionRevocation { readonly token?: string; readonly userId?: string; }

@Injectable()
export class AuthService {
  private readonly revocationListeners = new Set<(event: SessionRevocation) => void>();

  public constructor(@Inject(AUTH_MANAGER) private readonly auth: AuthManager, private readonly limiter: LoginRateLimiter) {}

  /** Returns whether the UI should display initial admin setup. */
  public bootstrapStatus(): Promise<BootstrapStatusDto> {
    return this.auth.getBootstrapStatus();
  }

  /** Registers the first admin account when bootstrap is still open. */
  public async registerAdmin(payload: unknown, ip = 'unknown'): Promise<AuthResponseDto> {
    const dto = parseCredentials(payload);
    await this.limiter.consume(ip, dto.email);
    try {
      const user = await this.auth.registerInitialAdmin(dto);
      return { user: mapUserToAuthUserDto(user) };
    } catch (error: unknown) {
      if (error instanceof AdminRegistrationClosedError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  /** Limits attempts before verifying credentials; tokens stay in cookie transport only. */
  public async login(payload: unknown, ip = 'unknown'): Promise<{ readonly token: string; readonly expiresAt: Date; readonly response: AuthResponseDto }> {
    const dto = parseCredentials(payload);
    await this.limiter.consume(ip, dto.email);
    try {
      const result = await this.auth.login({ ...dto, ipAddress: isIP(ip) ? ip : null });
      return { token: result.token, expiresAt: result.expiresAt, response: { user: mapUserToAuthUserDto(result.user) } };
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  /** Revokes the current session and closes its active transports. */
  public async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.auth.logout(token);
    for (const listener of this.revocationListeners) listener({ token });
  }

  /** Resolves authoritative session data for backend transports only. */
  public async session(token: string | undefined): Promise<AuthenticatedSession> {
    try {
      return await this.auth.authenticate(token ?? null);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  /** Returns only safe public user fields, never hashes or session tokens. */
  public async me(token: string | undefined): Promise<AuthResponseDto> {
    const session = await this.session(token);
    return { user: mapUserToAuthUserDto(session.user) };
  }

  /** Changes a verified password, revokes all sessions and closes active transports. */
  public async changePassword(token: string | undefined, payload: unknown): Promise<void> {
    const dto = parsePasswordChange(payload);
    const session = await this.session(token);
    try {
      await this.auth.changePassword(token ?? null, dto);
      for (const listener of this.revocationListeners) listener({ userId: session.user.id });
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError || error instanceof UnauthenticatedError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  /** Subscribes a backend transport to revocations; returns its cleanup function. */
  public onSessionRevoked(listener: (event: SessionRevocation) => void): () => void {
    this.revocationListeners.add(listener);
    return () => { this.revocationListeners.delete(listener); };
  }
}
