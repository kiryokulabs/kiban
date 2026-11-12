import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SqliteInstalledServiceRepository } from '../service/repositories/sqlite-installed-service.repository';
import { RuntimeImagesManager } from '@kiban/core';
import { dockerImageRequest, DockerImagesProvider } from '../service/providers/docker-images.provider';
import { ServerImagesController } from './server-images.controller';
import { RUNTIME_IMAGES_MANAGER, ServerImagesService } from './server-images.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ServerImagesController],
  providers: [
    ServerImagesService,
    SqliteInstalledServiceRepository,
    { provide: DockerImagesProvider, useFactory: (installed: SqliteInstalledServiceRepository) => new DockerImagesProvider(dockerImageRequest, installed), inject: [SqliteInstalledServiceRepository] },
    { provide: RUNTIME_IMAGES_MANAGER, useFactory: (provider: DockerImagesProvider) => new RuntimeImagesManager(provider), inject: [DockerImagesProvider] }
  ]
})
export class ServerModule {}
