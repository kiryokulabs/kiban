import { Controller, Get } from '@nestjs/common';
import { ProjectService } from '../services/project.service';

@Controller('projects')
export class ProjectController {
  public constructor(private readonly service: ProjectService) {}

  /** Returns a placeholder response until the project API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
