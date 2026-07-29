import { Controller, Get } from '@nestjs/common';
import { LogsService } from '../services/logs.service';

@Controller('logs')
export class LogsController {
  public constructor(private readonly service: LogsService) {}

  /** Returns a placeholder response until the logs API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
