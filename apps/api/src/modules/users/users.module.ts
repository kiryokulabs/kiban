import { Module } from '@nestjs/common';
import { UserManager } from '@kiban/core';
import { AuthModule } from '../auth/auth.module';
import { SqliteUserRepository } from '../auth/repositories/sqlite-user.repository';
import { NodePasswordHasherService } from '../auth/services/node-password-hasher.service';
import { UsersController } from './controllers/users.controller';
import { USER_MANAGER } from './interfaces/users.constants';
import { UsersService } from './services/users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_MANAGER,
      useFactory: (users: SqliteUserRepository, passwordHasher: NodePasswordHasherService): UserManager => new UserManager(users, passwordHasher),
      inject: [SqliteUserRepository, NodePasswordHasherService]
    }
  ]
})
export class UsersModule {}
