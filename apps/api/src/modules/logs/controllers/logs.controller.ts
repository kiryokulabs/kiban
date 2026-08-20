import { Controller, Get } from '@nestjs/common';
import type { LogsDto } from '../dto/logs.dto';
import { LogsService } from '../services/logs.service';

@Controller('logs')
export class LogsController {
  public constructor(private readonly service: LogsService) {}

  /** Returns Kiban platform logs from the core Docker runtime. */
  @Get()
  public list(): Promise<LogsDto> {
    return this.service.kiban();
  }
}
