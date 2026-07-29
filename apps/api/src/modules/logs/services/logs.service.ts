import { Injectable } from '@nestjs/common';

@Injectable()
export class LogsService {
  /** Provides a stable not-implemented placeholder for the logs module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Logs module is ready; implementation is not included in foundation v0.1.' };
  }
}
