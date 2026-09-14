import { Controller, Get } from '@nestjs/common';
import { Public } from '../../auth/guards/session-auth.guard';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  public constructor(private readonly service: HealthService) {}

  /** Returns a placeholder response until the health API surface is implemented. */
  @Public()
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
