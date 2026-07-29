import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  /** Provides a stable not-implemented placeholder for the health module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Health module is ready; implementation is not included in foundation v0.1.' };
  }
}
