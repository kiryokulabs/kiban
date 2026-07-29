import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthResponseDto, BootstrapStatusDto, LoginDto, RegisterAdminDto } from '../dto/auth.dto';
import { AUTH_SESSION_COOKIE_NAME } from '../interfaces/auth.constants';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  /** Returns whether the first admin account still needs to be created. */
  @Get('bootstrap-status')
  public bootstrapStatus(): Promise<BootstrapStatusDto> {
    return this.auth.bootstrapStatus();
  }

  /** Creates the initial admin account; disabled once an admin exists. */
  @Post('register-admin')
  public registerAdmin(@Body() dto: RegisterAdminDto): Promise<AuthResponseDto> {
    return this.auth.registerAdmin(dto);
  }

  /** Logs in and writes an httpOnly session cookie. */
  @Post('login')
  @HttpCode(200)
  public async login(@Body() dto: LoginDto, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponseDto> {
    const result = await this.auth.login(dto);
    reply.setCookie(AUTH_SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires: result.expiresAt
    });
    return result.response;
  }

  /** Revokes the current session and clears the cookie. */
  @Post('logout')
  @HttpCode(204)
  public async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.auth.logout(this.readSessionCookie(request));
    reply.clearCookie(AUTH_SESSION_COOKIE_NAME, { path: '/' });
  }

  /** Returns the current authenticated user. */
  @Get('me')
  public me(@Req() request: FastifyRequest): Promise<AuthResponseDto> {
    return this.auth.me(this.readSessionCookie(request));
  }

  private readSessionCookie(request: FastifyRequest): string | undefined {
    const cookies = request.cookies as Readonly<Record<string, string | undefined>> | undefined;
    return cookies?.[AUTH_SESSION_COOKIE_NAME];
  }
}
