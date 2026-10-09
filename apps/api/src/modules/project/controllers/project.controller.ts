import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, StreamableFile } from '@nestjs/common';
import type { EnvironmentDto, ProjectDetailsDto, ProjectSettingsDto, ProjectSummaryDto } from '../dto/project.dto';
import { ProjectService } from '../services/project.service';

@Controller('projects')
export class ProjectController {
  public constructor(private readonly projects: ProjectService) {}

  /** Lists every project. */
  @Get()
  public list(): Promise<readonly ProjectSummaryDto[]> {
    return this.projects.list();
  }

  /** Gets project settings and aggregate information. */
  @Get(':id/settings')
  public settings(@Param('id') id: string): Promise<ProjectSettingsDto> {
    return this.projects.getSettings(id);
  }

  /** Gets the stored project image. */
  @Get(':id/image')
  public async image(@Param('id') id: string): Promise<StreamableFile> {
    const image = await this.projects.getImage(id);
    return new StreamableFile(image.data, { type: image.contentType });
  }

  /** Stores or replaces the project image. */
  @Put(':id/image')
  @HttpCode(204)
  public saveImage(@Param('id') id: string, @Body() body: unknown): Promise<void> {
    return this.projects.saveImage(id, body);
  }

  /** Gets one project including environments. */
  @Get(':id')
  public get(@Param('id') id: string): Promise<ProjectDetailsDto> {
    return this.projects.get(id);
  }

  /** Creates a project and its default environments. */
  @Post()
  public create(@Body() body: unknown): Promise<ProjectDetailsDto> {
    return this.projects.create(body);
  }

  /** Updates project editable fields. */
  @Patch(':id')
  public update(@Param('id') id: string, @Body() body: unknown): Promise<ProjectDetailsDto> {
    return this.projects.update(id, body);
  }

  /** Deletes a project and its environments. */
  @Delete(':id')
  @HttpCode(204)
  public delete(@Param('id') id: string): Promise<void> {
    return this.projects.delete(id);
  }


  /** Creates a custom environment for a project. */
  @Post(':id/environments')
  public createEnvironment(@Param('id') id: string, @Body() body: unknown): Promise<EnvironmentDto> {
    return this.projects.createEnvironment(id, body);
  }

  /** Deletes a custom environment for a project. */
  @Delete(':id/environments/:environmentId')
  @HttpCode(204)
  public deleteEnvironment(@Param('id') id: string, @Param('environmentId') environmentId: string): Promise<void> {
    return this.projects.deleteEnvironment(id, environmentId);
  }

  /** Lists environments for a project. */
  @Get(':id/environments')
  public listEnvironments(@Param('id') id: string): Promise<readonly EnvironmentDto[]> {
    return this.projects.listEnvironments(id);
  }
}
