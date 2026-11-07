import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';

/** Operational history is available to authenticated administrators and operators. */
@Controller('activity')
export class ActivityController {
  public constructor(private readonly activity: ActivityService) {}
  @Get()
  public recent() { return this.activity.recent(); }

  /** Retained history for all authenticated users, without client-controlled page size. */
  @Get('history')
  public history(@Query('page') page: unknown) { return this.activity.history(page); }

}
