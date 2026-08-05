import type { InstallationPlan, ProjectRepository, RuntimeProvider, RuntimeResult, RuntimeHealth, InstalledService } from '@kiban/core';
import { ProjectNotFoundError } from '@kiban/core';
import { DomainService } from '../../runtime/domain/domain.service';

/** Decorates a runtime provider with Kiban-owned public routing metadata. */
export class RoutedRuntimeProvider implements RuntimeProvider {
  public constructor(
    private readonly delegate: RuntimeProvider,
    private readonly projects: ProjectRepository,
    private readonly domains: DomainService
  ) {}

  /** Adds generated public endpoints before delegating installation to the concrete runtime. */
  public async install(plan: InstallationPlan): Promise<RuntimeResult> {
    const project = await this.projects.findById(plan.environment.projectId);
    if (!project) throw new ProjectNotFoundError();
    const publicEndpoints = plan.serviceDefinition.metadata.accessPoints
      .filter((accessPoint) => accessPoint.kind === 'web')
      .map((accessPoint) => {
        const input = { project, environment: plan.environment, service: { id: plan.serviceDefinition.id, name: plan.serviceDefinition.metadata.name } };
        return {
          name: accessPoint.name,
          service: accessPoint.service,
          port: accessPoint.port,
          host: this.domains.buildHost(input),
          url: this.domains.buildUrl(input),
          protocol: this.domains.protocol()
        };
      });
    return this.delegate.install({ ...plan, publicEndpoints });
  }

  /** Delegates runtime removal. */
  public uninstall(service: InstalledService): Promise<RuntimeResult> { return this.delegate.uninstall(service); }
  /** Delegates runtime start. */
  public start(service: InstalledService): Promise<RuntimeResult> { return this.delegate.start(service); }
  /** Delegates runtime stop. */
  public stop(service: InstalledService): Promise<RuntimeResult> { return this.delegate.stop(service); }
  /** Delegates runtime restart. */
  public restart(service: InstalledService): Promise<RuntimeResult> { return this.delegate.restart(service); }
  /** Delegates runtime health checks. */
  public health(service: InstalledService): Promise<RuntimeHealth> { return this.delegate.health(service); }
  /** Delegates runtime log reads. */
  public getLogs(service: InstalledService): Promise<string> { return this.delegate.getLogs ? this.delegate.getLogs(service) : Promise.resolve(''); }
}
