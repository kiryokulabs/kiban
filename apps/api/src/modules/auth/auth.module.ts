import { Module } from '@nestjs/common';
import { AuthManager } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './controllers/auth.controller';
import { AUTH_MANAGER } from './interfaces/auth.constants';
import { SqliteAuthSessionRepository } from './repositories/sqlite-auth-session.repository';
import { SqliteUserRepository } from './repositories/sqlite-user.repository';
import { AuthService } from './services/auth.service';
import { NodePasswordHasherService } from './services/node-password-hasher.service';
import { NodeSessionTokenService } from './services/node-session-token.service';
import { AuthTransportPolicy } from './services/auth-transport-policy';
import { LoginRateLimiter } from './services/login-rate-limiter';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginRateLimiter,
    AuthTransportPolicy,
    SqliteSettingsRepository,
    SqliteUserRepository,
    SqliteAuthSessionRepository,
    NodePasswordHasherService,
    NodeSessionTokenService,
    {
      provide: AUTH_MANAGER,
      useFactory: (
        users: SqliteUserRepository,
        sessions: SqliteAuthSessionRepository,
        passwordHasher: NodePasswordHasherService,
        tokenService: NodeSessionTokenService
      ): AuthManager => new AuthManager(users, sessions, passwordHasher, tokenService, { sessionTtlMs: 1000 * 60 * 60 * 24 * 7, now: () => new Date() }),
      inject: [SqliteUserRepository, SqliteAuthSessionRepository, NodePasswordHasherService, NodeSessionTokenService]
    }
  ],
  exports: [AuthService, AuthTransportPolicy, AUTH_MANAGER, SqliteUserRepository, NodePasswordHasherService]
})
export class AuthModule {}
