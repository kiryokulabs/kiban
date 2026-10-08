import { Module } from '@nestjs/common';
import { ProjectManager } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { ServiceModule } from '../service/service.module';
import { ServiceService } from '../service/services/service.service';
import { ProjectController } from './controllers/project.controller';
import { PROJECT_MANAGER } from './interfaces/project.constants';
import { PROJECT_IMAGE_STORAGE } from './interfaces/project-image-storage';
import { SqliteEnvironmentRepository } from './repositories/sqlite-environment.repository';
import { SqliteProjectRepository } from './repositories/sqlite-project.repository';
import { SqliteProjectUnitOfWork } from './repositories/sqlite-project-unit-of-work';
import { ProjectService } from './services/project.service';
import { FilesystemProjectImageStorage } from './storage/filesystem-project-image.storage';

@Module({
  imports: [DatabaseModule, ServiceModule],
  controllers: [ProjectController],
  providers: [
    { provide: ProjectService, useFactory: (projects: ProjectManager, services: ServiceService, images: FilesystemProjectImageStorage): ProjectService => new ProjectService(projects, services, images), inject: [PROJECT_MANAGER, ServiceService, PROJECT_IMAGE_STORAGE] },
    { provide: PROJECT_IMAGE_STORAGE, useFactory: (): FilesystemProjectImageStorage => new FilesystemProjectImageStorage() },
    SqliteProjectRepository,
    SqliteEnvironmentRepository,
    SqliteProjectUnitOfWork,
    {
      provide: PROJECT_MANAGER,
      useFactory: (projects: SqliteProjectRepository, environments: SqliteEnvironmentRepository, unitOfWork: SqliteProjectUnitOfWork): ProjectManager => new ProjectManager(projects, environments, unitOfWork),
      inject: [SqliteProjectRepository, SqliteEnvironmentRepository, SqliteProjectUnitOfWork]
    }
  ]
})
export class ProjectModule {}
