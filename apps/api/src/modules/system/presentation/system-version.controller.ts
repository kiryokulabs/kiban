import { Controller, Get } from '@nestjs/common';
import { SystemVersionService, type SystemVersionInfo } from '../application/system-version.service';

@Controller('system')
export class SystemVersionController {
  public constructor(private readonly service: SystemVersionService) {}

  /** Returns installed and latest Kiban version information for update notices. */
  @Get('version')
  public async getVersion(): Promise<SystemVersionInfo> {
    return this.service.getVersion();
  }
}
