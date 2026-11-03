import { Module } from '@nestjs/common';
import { SmtpSettingsManager } from '@kiban/core';
import { createKibanPaths } from '@kiban/config';
import { homedir } from 'node:os';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';
import { SmtpController } from './smtp.controller';
import { SmtpService, SMTP_SETTINGS_MANAGER } from './smtp.service';
import { SmtpSettingsCipher } from './smtp-settings-cipher';
import { EncryptedSmtpSettingsRepository } from './smtp-settings.repository';
import { NodemailerSmtpSender } from './nodemailer-smtp-sender';

/** Isolated mail configuration: no runtime, routing, service or TLS-proxy dependencies. */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SmtpController],
  providers: [
    SmtpService,
    SqliteSettingsRepository,
    { provide: SmtpSettingsCipher, useFactory: (): SmtpSettingsCipher => new SmtpSettingsCipher(join(createKibanPaths(homedir()).config, 'smtp.key')) },
    { provide: EncryptedSmtpSettingsRepository, useFactory: (settings: SqliteSettingsRepository, cipher: SmtpSettingsCipher): EncryptedSmtpSettingsRepository => new EncryptedSmtpSettingsRepository(settings, cipher), inject: [SqliteSettingsRepository, SmtpSettingsCipher] },
    { provide: NodemailerSmtpSender, useFactory: (): NodemailerSmtpSender => new NodemailerSmtpSender((options) => nodemailer.createTransport(options)) },
    { provide: SMTP_SETTINGS_MANAGER, useFactory: (settings: EncryptedSmtpSettingsRepository, sender: NodemailerSmtpSender): SmtpSettingsManager => new SmtpSettingsManager(settings, sender), inject: [EncryptedSmtpSettingsRepository, NodemailerSmtpSender] }
  ]
})
export class SmtpModule {}
