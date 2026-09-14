import { Injectable } from '@nestjs/common';
import { DockerComposeRuntimeProvider } from '../../service/providers/docker-compose-runtime.provider';
import type { FleetStatsProvider } from '../application/fleet-stats.provider';
import type { FleetStats } from '../application/monitoring.models';

/** Adapts the current Docker Compose runtime backend to monitoring's generic fleet stats port. */
@Injectable()
export class DockerComposeFleetStatsProvider implements FleetStatsProvider {
  public constructor(private readonly runtime: DockerComposeRuntimeProvider) {}

  public getFleetStats(): Promise<FleetStats> {
    return this.runtime.fleetStats();
  }
}
