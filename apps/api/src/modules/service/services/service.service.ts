import { Injectable } from '@nestjs/common';

@Injectable()
export class ServiceService {
  /** Provides a stable not-implemented placeholder for the service module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Service module is ready; implementation is not included in foundation v0.1.' };
  }
}
