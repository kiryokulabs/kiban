import type { TraefikInfo } from '../../service/providers/docker-compose-runtime.provider';

/** Applies or removes instance domain routing and provides Traefik info. */
export interface InstanceDomainApplier {
  applyInstanceDomain(domain: string): Promise<boolean>;
  getTraefikInfo(): Promise<TraefikInfo>;
}
