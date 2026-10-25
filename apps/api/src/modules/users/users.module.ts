import { Module } from '@nestjs/common';
import { UserManager, UserPreferencesManager } from '@kiban/core';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { SqliteUserRepository } from '../auth/repositories/sqlite-user.repository';
import { NodePasswordHasherService } from '../auth/services/node-password-hasher.service';
import { UsersController } from './controllers/users.controller';
import { USER_MANAGER, USER_PREFERENCES_MANAGER } from './interfaces/users.constants';
import { SqliteUserPreferencesRepository } from './repositories/sqlite-user-preferences.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    SqliteUserPreferencesRepository,
    {
      provide: USER_MANAGER,
      useFactory: (users: SqliteUserRepository, passwordHasher: NodePasswordHasherService): UserManager => new UserManager(users, passwordHasher),
      inject: [SqliteUserRepository, NodePasswordHasherService]
    },
    {
      provide: USER_PREFERENCES_MANAGER,
      useFactory: (preferences: SqliteUserPreferencesRepository): UserPreferencesManager => new UserPreferencesManager(preferences),
      inject: [SqliteUserPreferencesRepository]
    }
  ]
})
export class UsersModule {}
