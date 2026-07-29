import { Module } from '@nestjs/common';
import { StackController } from './controllers/stack.controller';
import { StackService } from './services/stack.service';

@Module({ controllers: [StackController], providers: [StackService], exports: [StackService] })
export class StackModule {}
