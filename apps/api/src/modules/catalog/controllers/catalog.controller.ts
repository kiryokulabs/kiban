import { Controller, Get } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';

@Controller('catalog')
export class CatalogController {
  public constructor(private readonly service: CatalogService) {}

  /** Returns a placeholder response until the catalog API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
