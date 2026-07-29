import { Controller, Get } from '@nestjs/common';
import { ServiceService } from '../services/service.service';

@Controller('services')
export class ServiceController {
  public constructor(private readonly service: ServiceService) {}

  /** Returns a placeholder response until the service API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
