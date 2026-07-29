import { Module } from '@nestjs/common';
import { LogsController } from './controllers/logs.controller';
import { LogsService } from './services/logs.service';

@Module({ controllers: [LogsController], providers: [LogsService], exports: [LogsService] })
export class LogsModule {}
