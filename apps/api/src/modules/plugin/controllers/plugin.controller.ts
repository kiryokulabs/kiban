import { Controller, Get } from '@nestjs/common';
import { PluginService } from '../services/plugin.service';

@Controller('plugins')
export class PluginController {
  public constructor(private readonly service: PluginService) {}

  /** Returns a placeholder response until the plugin API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
