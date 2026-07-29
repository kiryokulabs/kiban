import { Module } from '@nestjs/common';
import { DockerController } from './controllers/docker.controller';
import { DockerService } from './services/docker.service';

@Module({ controllers: [DockerController], providers: [DockerService], exports: [DockerService] })
export class DockerModule {}
