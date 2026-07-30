import { Module } from '@nestjs/common';
import { ProjectManager } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { ProjectController } from './controllers/project.controller';
import { PROJECT_MANAGER } from './interfaces/project.constants';
import { SqliteEnvironmentRepository } from './repositories/sqlite-environment.repository';
import { SqliteProjectRepository } from './repositories/sqlite-project.repository';
import { SqliteProjectUnitOfWork } from './repositories/sqlite-project-unit-of-work';
import { ProjectService } from './services/project.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectController],
  providers: [
    ProjectService,
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
