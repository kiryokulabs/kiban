import { Controller, Get } from '@nestjs/common';
import type { RuntimeStatusDto } from '../dto/runtime.dto';
import { DockerComposeRuntimeProvider } from '../providers/docker-compose-runtime.provider';

@Controller('runtime')
export class RuntimeController {
  public constructor(private readonly docker: DockerComposeRuntimeProvider) {}

  /** Returns runtime diagnostics for API/UI. */
  @Get('status')
  public status(): Promise<RuntimeStatusDto> {
    return this.docker.diagnostics();
  }
}
