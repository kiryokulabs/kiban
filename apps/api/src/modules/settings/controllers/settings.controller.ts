import { Controller, Get } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';

@Controller('settings')
export class SettingsController {
  public constructor(private readonly service: SettingsService) {}

  /** Returns a placeholder response until the settings API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
