import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import type { TraefikInfo } from '../../service/providers/docker-compose-runtime.provider';

interface InstanceDomainDto {
  readonly domain: string;
}

interface InstanceDomainResponseDto {
  readonly domain: string | null;
}

interface WildcardDomainDto {
  readonly domain: string;
}

interface WildcardDomainResponseDto {
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

  /** Returns Traefik reverse proxy information and active routers. */
  @Get('traefik')
  public async getTraefik(): Promise<TraefikInfo> {
    return this.service.getTraefikInfo();
  }

  /** Returns the configured wildcard domain for service URLs, or null when not set. */
  @Get('wildcard-domain')
  public async getWildcardDomain(): Promise<WildcardDomainResponseDto> {
    const domain = await this.service.getWildcardDomain();
    return { domain };
  }

  /** Saves the wildcard domain used to generate service URLs. */
  @Put('wildcard-domain')
  @HttpCode(204)
  public async setWildcardDomain(@Body() body: WildcardDomainDto): Promise<void> {
    await this.service.setWildcardDomain(body.domain);
  }
}
