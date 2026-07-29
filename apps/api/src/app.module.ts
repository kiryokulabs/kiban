import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DockerModule } from './modules/docker/docker.module';
import { HealthModule } from './modules/health/health.module';
import { LogsModule } from './modules/logs/logs.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { ProjectModule } from './modules/project/project.module';
import { ServiceModule } from './modules/service/service.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StackModule } from './modules/stack/stack.module';
import { UsersModule } from './modules/users/users.module';

@Module({ imports: [DatabaseModule, AuthModule, ProjectModule, PluginModule, CatalogModule, DockerModule, HealthModule, SettingsModule, LogsModule, StackModule, ServiceModule, UsersModule] })
export class AppModule {}
