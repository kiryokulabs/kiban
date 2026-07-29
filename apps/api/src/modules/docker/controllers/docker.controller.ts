import { Controller, Get } from '@nestjs/common';
import { DockerService } from '../services/docker.service';

@Controller('docker')
export class DockerController {
  public constructor(private readonly service: DockerService) {}

  /** Returns a placeholder response until the docker API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
