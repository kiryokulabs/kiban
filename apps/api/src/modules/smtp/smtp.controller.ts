import { Body, Controller, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { SmtpSettingsView } from '@kiban/core';
import { AUTH_SESSION_COOKIE_NAME } from '../auth/interfaces/auth.constants';
import { SmtpService } from './smtp.service';

/** Dedicated SMTP settings endpoints; all permissions are enforced by the backend. */
@Controller('notifications/smtp')
export class SmtpController {
  public constructor(private readonly smtp: SmtpService) {}

  /** Returns null when SMTP is not configured; never exposes saved passwords. */
  @Get()
  public get(@Req() request: FastifyRequest): Promise<SmtpSettingsView | null> { return this.smtp.get(request.cookies[AUTH_SESSION_COOKIE_NAME]); }

  /** Saves SMTP configuration after backend authorization and validation. */
  @Put()
  public save(@Req() request: FastifyRequest, @Body() payload: unknown): Promise<SmtpSettingsView> { return this.smtp.save(request.cookies[AUTH_SESSION_COOKIE_NAME], payload); }

  /** Sends a fixed test message using the saved configuration. */
  @Post('test')
  @HttpCode(204)
  public sendTest(@Req() request: FastifyRequest): Promise<void> { return this.smtp.sendTest(request.cookies[AUTH_SESSION_COOKIE_NAME]); }
}
