import { Controller, Delete, Get, HttpCode, Param, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
import { ServerImagesService } from './server-images.service';

/** Reads require a session; destructive maintenance additionally requires a backend-verified admin. */
@Controller('server/images')
export class ServerImagesController {
  public constructor(private readonly images: ServerImagesService) {}

  @Get()
  public list() { return this.images.list(); }

  @Delete(':id')
  @HttpCode(204)
  public remove(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Query('tag') tag: unknown): Promise<void> {
    return this.images.remove(request.user, id, tag);
  }
}
