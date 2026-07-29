import { Injectable } from '@nestjs/common';

@Injectable()
export class SettingsService {
  /** Provides a stable not-implemented placeholder for the settings module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Settings module is ready; implementation is not included in foundation v0.1.' };
  }
}
