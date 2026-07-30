import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { InstalledServiceDto } from '../dto/service.dto';
import { ServiceService } from '../services/service.service';

@Controller()
export class ServiceController {
  public constructor(private readonly service: ServiceService) {}

  /** Lists services installed in an environment. */
  @Get('projects/:projectId/environments/:environmentId/services')
  public list(@Param('projectId') projectId: string, @Param('environmentId') environmentId: string): Promise<readonly InstalledServiceDto[]> {
    return this.service.list(projectId, environmentId);
  }

  /** Installs a service into an environment. */
  @Post('projects/:projectId/environments/:environmentId/services')
  public install(@Param('projectId') projectId: string, @Param('environmentId') environmentId: string, @Body() body: unknown): Promise<InstalledServiceDto> {
    return this.service.install(projectId, environmentId, body);
  }

  /** Gets one installed service. */
  @Get('services/:id')
  public get(@Param('id') id: string): Promise<InstalledServiceDto> { return this.service.get(id); }

  /** Deletes one installed service record. */
  @Delete('services/:id')
  @HttpCode(204)
  public delete(@Param('id') id: string): Promise<void> { return this.service.delete(id); }

  /** Starts one installed service. */
  @Patch('services/:id/start')
  public start(@Param('id') id: string): Promise<InstalledServiceDto> { return this.service.start(id); }

  /** Stops one installed service. */
  @Patch('services/:id/stop')
  public stop(@Param('id') id: string): Promise<InstalledServiceDto> { return this.service.stop(id); }

  /** Restarts one installed service. */
  @Patch('services/:id/restart')
  public restart(@Param('id') id: string): Promise<InstalledServiceDto> { return this.service.restart(id); }
}
