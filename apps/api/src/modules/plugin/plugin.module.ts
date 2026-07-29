import { Module } from '@nestjs/common';
import { PluginController } from './controllers/plugin.controller';
import { PluginService } from './services/plugin.service';

@Module({ controllers: [PluginController], providers: [PluginService], exports: [PluginService] })
export class PluginModule {}
