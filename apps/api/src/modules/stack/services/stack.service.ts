import { Injectable } from '@nestjs/common';

@Injectable()
export class StackService {
  /** Provides a stable not-implemented placeholder for the stack module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Stack module is ready; implementation is not included in foundation v0.1.' };
  }
}
