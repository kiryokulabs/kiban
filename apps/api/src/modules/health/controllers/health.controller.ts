import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  public constructor(private readonly service: HealthService) {}

  /** Returns a placeholder response until the health API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
