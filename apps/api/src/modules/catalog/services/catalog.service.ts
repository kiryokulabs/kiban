import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogService {
  /** Provides a stable not-implemented placeholder for the catalog module. */
  public placeholder(): { readonly message: string } {
    return { message: 'Catalog module is ready; implementation is not included in foundation v0.1.' };
  }
}
