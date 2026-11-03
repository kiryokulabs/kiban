import { BadGatewayException, BadRequestException, ForbiddenException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ForbiddenUserActionError, SmtpConfigurationError, SmtpDeliveryError, SmtpSettingsManager, SmtpValidationError, type SmtpSettingsView } from '@kiban/core';
import { AuthService } from '../auth/services/auth.service';

export const SMTP_SETTINGS_MANAGER = Symbol('SMTP_SETTINGS_MANAGER');

/** Maps authenticated SMTP use cases to HTTP without leaking credentials or SMTP responses. */
@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  public constructor(private readonly auth: AuthService, @Inject(SMTP_SETTINGS_MANAGER) private readonly smtp: SmtpSettingsManager) {}

  /** Reads the password-free SMTP view for an authenticated user. */
  public async get(token: string | undefined): Promise<SmtpSettingsView | null> {
    const { user } = await this.auth.session(token);
    return this.execute(() => this.smtp.get(user));
  }

  /** Saves validated settings without returning the stored SMTP password. */
  public async save(token: string | undefined, payload: unknown): Promise<SmtpSettingsView> {
    const { user } = await this.auth.session(token);
    return this.execute(() => this.smtp.save(user, payload));
  }

  /** Sends only to the administrator identified by the backend session. */
  public async sendTest(token: string | undefined): Promise<void> {
    const { user } = await this.auth.session(token);
    return this.execute(() => this.smtp.sendTest(user));
  }

  private async execute<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error: unknown) {
      if (error instanceof ForbiddenUserActionError) throw new ForbiddenException(error.message);
      if (error instanceof SmtpValidationError) throw new BadRequestException(error.message);
      if (error instanceof SmtpDeliveryError) throw new BadGatewayException(error.message);
      if (error instanceof SmtpConfigurationError) throw new ServiceUnavailableException(error.message);
      this.logger.error('SMTP settings operation failed.');
      throw new ServiceUnavailableException('Could not access SMTP settings. Check the backend storage and permissions.');
    }
  }
}
