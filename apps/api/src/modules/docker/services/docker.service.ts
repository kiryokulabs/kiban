import { Injectable } from '@nestjs/common';

@Injectable()
export class DockerService {
  /** Provides a stable not-implemented placeholder for the docker module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Docker module is ready; implementation is not included in foundation v0.1.' };
  }
}
