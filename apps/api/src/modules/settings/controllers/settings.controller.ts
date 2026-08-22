import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';

interface InstanceDomainDto {
  readonly domain: string;
}

interface InstanceDomainResponseDto {
  readonly domain: string | null;
}

@Controller('settings')
export class SettingsController {
  public constructor(private readonly service: SettingsService) {}

  /** Returns the configured instance domain, or null when not set. */
  @Get('domain')
  public async getDomain(): Promise<InstanceDomainResponseDto> {
    const domain = await this.service.getInstanceDomain();
    return { domain };
  }

  /** Saves the instance domain. */
  @Put('domain')
  @HttpCode(204)
  public async setDomain(@Body() body: InstanceDomainDto): Promise<void> {
    await this.service.setInstanceDomain(body.domain);
  }
}
