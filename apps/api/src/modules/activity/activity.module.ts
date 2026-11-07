import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ActivityController } from './activity.controller';
import { ACTIVITY_REPOSITORY, ActivityService } from './activity.service';
import { SqliteActivityRepository } from './sqlite-activity.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ActivityController],
  providers: [ActivityService, SqliteActivityRepository, { provide: ACTIVITY_REPOSITORY, useExisting: SqliteActivityRepository }],
  exports: [ActivityService]
})
export class ActivityModule {}
