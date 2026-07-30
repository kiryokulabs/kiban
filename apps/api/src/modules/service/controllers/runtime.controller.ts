import { Controller, Get } from '@nestjs/common';
import type { RuntimeStatusDto } from '../dto/runtime.dto';
import { DockerRuntimeProvider } from '../providers/docker-runtime.provider';

@Controller('runtime')
export class RuntimeController {
  public constructor(private readonly docker: DockerRuntimeProvider) {}

  /** Returns runtime diagnostics for API/UI. */
  @Get('status')
  public status(): Promise<RuntimeStatusDto> {
    return this.docker.diagnostics();
  }
}
