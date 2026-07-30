import { Controller, Get, Query } from '@nestjs/common';
import type { CatalogCategoryDto, CatalogItemDto, CatalogResponseDto } from '../dto/catalog.dto';
import { CatalogService } from '../services/catalog.service';

@Controller('catalog')
export class CatalogController {
  public constructor(private readonly service: CatalogService) {}

  /** Returns all discovered catalog categories and services. */
  @Get()
  public list(@Query('q') query?: string): Promise<CatalogResponseDto> {
    return this.service.list(query);
  }

  /** Returns all discovered catalog categories. */
  @Get('categories')
  public categories(): Promise<readonly CatalogCategoryDto[]> {
    return this.service.listCategories();
  }

  /** Returns all discovered catalog service definitions. */
  @Get('services')
  public services(@Query('q') query?: string): Promise<readonly CatalogItemDto[]> {
    return this.service.listItems(query);
  }
}
