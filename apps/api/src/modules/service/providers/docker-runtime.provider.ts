import { Injectable } from '@nestjs/common';
import type { InstallationPlan, InstalledService, RuntimeHealth, RuntimeProvider, RuntimeResult } from '@kiban/core';

/** Mock Docker runtime provider. It validates architecture without talking to Docker Engine yet. */
@Injectable()
export class DockerRuntimeProvider implements RuntimeProvider {
  /** Mocks installation execution. */
  public async install(_plan: InstallationPlan): Promise<RuntimeResult> { return { status: 'running' }; }
  /** Mocks uninstall execution. */
  public async uninstall(_service: InstalledService): Promise<RuntimeResult> { return { status: 'stopped' }; }
  /** Mocks start execution. */
  public async start(_service: InstalledService): Promise<RuntimeResult> { return { status: 'running' }; }
  /** Mocks stop execution. */
  public async stop(_service: InstalledService): Promise<RuntimeResult> { return { status: 'stopped' }; }
  /** Mocks restart execution. */
  public async restart(_service: InstalledService): Promise<RuntimeResult> { return { status: 'running' }; }
  /** Mocks health checks. */
  public async health(_service: InstalledService): Promise<RuntimeHealth> { return { status: 'healthy' }; }
}
