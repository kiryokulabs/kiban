import { Module } from '@nestjs/common';
import { ServiceModule } from '../service/service.module';
import { DockerComposeRuntimeProvider } from '../service/providers/docker-compose-runtime.provider';
import { LogsController } from './controllers/logs.controller';
import { LogsService } from './services/logs.service';

@Module({ imports: [ServiceModule], controllers: [LogsController], providers: [LogsService, { provide: 'KIBAN_LOGS_READER', useExisting: DockerComposeRuntimeProvider }], exports: [LogsService] })
export class LogsModule {}
