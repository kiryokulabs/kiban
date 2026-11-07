import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request';
import { Body, Req, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { InstalledServiceDto } from '../dto/service.dto';
import type { InstalledServiceDetailsDto } from '../dto/service-details.dto';
import type { ServiceLogsDto, ServiceRuntimeDto } from '../dto/runtime.dto';
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
  public install(@Param('projectId') projectId: string, @Param('environmentId') environmentId: string, @Body() body: unknown, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> {
    return this.service.install(projectId, environmentId, body, request.user);
  }

  /** Lists every installed service. */
  @Get('services')
  public listAll(): Promise<readonly InstalledServiceDto[]> { return this.service.listAll(); }

  /** Gets one installed service. */
  @Get('services/:id')
  public get(@Param('id') id: string): Promise<InstalledServiceDto> { return this.service.get(id); }

  /** Gets full management details for one installed service. */
  @Get('services/:id/details')
  public details(@Param('id') id: string): Promise<InstalledServiceDetailsDto> { return this.service.details(id); }

  /** Saves and applies installed service configuration. */
  @Patch('services/:id/configuration')
  public updateConfiguration(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> { return this.service.updateConfiguration(id, body, request.user); }

  /** Updates the public domain used to access one installed service. */
  @Patch('services/:id/domain')
  public updateDomain(@Param('id') id: string, @Body() body: unknown): Promise<InstalledServiceDto> { return this.service.updateDomain(id, body); }

  /** Recreates one installed service. */
  @Patch('services/:id/recreate')
  public recreate(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> { return this.service.recreate(id, request.user); }

  /** Gets runtime metadata for one installed service. */
  @Get('services/:id/runtime')
  public runtime(@Param('id') id: string): Promise<ServiceRuntimeDto> { return this.service.runtimeMetadata(id); }

  /** Gets recent runtime logs for one installed service. */
  @Get('services/:id/logs')
  public logs(@Param('id') id: string): Promise<ServiceLogsDto> { return this.service.logs(id); }

  /** Deletes one installed service record. */
  @Delete('services/:id')
  @HttpCode(204)
  public delete(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<void> { return this.service.delete(id, request.user); }

  /** Starts one installed service. */
  @Patch('services/:id/start')
  public start(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> { return this.service.start(id, request.user); }

  /** Stops one installed service. */
  @Patch('services/:id/stop')
  public stop(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> { return this.service.stop(id, request.user); }

  /** Restarts one installed service. */
  @Patch('services/:id/restart')
  public restart(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InstalledServiceDto> { return this.service.restart(id, request.user); }
}
