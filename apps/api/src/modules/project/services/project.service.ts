import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectService {
  /** Provides a stable not-implemented placeholder for the project module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Project module is ready; implementation is not included in foundation v0.1.' };
  }
}
