import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AUTH_SESSION_COOKIE_NAME } from '../interfaces/auth.constants';
import { AuthService } from '../services/auth.service';

export const PUBLIC_ROUTE_METADATA = 'kiban:public-route';

/** Marks an endpoint as intentionally reachable without an authenticated Kiban session. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_ROUTE_METADATA, true);

/** Requires a valid Kiban session for every API route unless explicitly marked public. */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  public constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true;

    const token = this.sessionToken(context);
    if (!token) throw new UnauthorizedException('Authentication required.');

    await this.auth.me(token);
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_METADATA, [context.getHandler(), context.getClass()]) === true;
  }

  private sessionToken(context: ExecutionContext): string | undefined {
    const type = context.getType<'http' | 'ws'>();
    if (type === 'ws') return this.webSocketSessionToken(context);
    return this.httpSessionToken(context);
  }

  private httpSessionToken(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const cookies = request.cookies as Readonly<Record<string, string | undefined>> | undefined;
    return cookies?.[AUTH_SESSION_COOKIE_NAME];
  }

  private webSocketSessionToken(context: ExecutionContext): string | undefined {
    const client = context.switchToWs().getClient<{ readonly handshake?: { readonly headers?: Readonly<Record<string, string | undefined>> } }>();
    const cookieHeader = client.handshake?.headers?.['cookie'];
    if (!cookieHeader) return undefined;
    return cookieHeader
      .split(';')
      .map((part) => part.trim())
      .map((part) => part.split('='))
      .find(([name]) => name === AUTH_SESSION_COOKIE_NAME)?.[1];
  }
}
