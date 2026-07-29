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

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
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
  exports: [AuthService, AUTH_MANAGER, SqliteUserRepository, NodePasswordHasherService]
})
export class AuthModule {}
