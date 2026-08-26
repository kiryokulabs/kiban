import { Injectable } from '@nestjs/common';

@Injectable()
export class PluginService {
  /** Provides a stable not-implemented placeholder for the plugin module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Plugin module is ready; implementation is not included in this foundation.' };
  }
}
