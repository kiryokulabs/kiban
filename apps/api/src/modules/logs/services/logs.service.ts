import { Inject, Injectable } from '@nestjs/common';
import type { LogsDto } from '../dto/logs.dto';

export interface KibanLogsReader { platformLogs(): Promise<LogsDto>; }

@Injectable()
export class LogsService {
  public constructor(@Inject('KIBAN_LOGS_READER') private readonly reader: KibanLogsReader) {}

  /** Returns Kiban platform logs from the installed Docker runtime when available. */
  public kiban(): Promise<LogsDto> {
    return this.reader.platformLogs();
  }
}
