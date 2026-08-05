import { Inject, Injectable, Optional } from '@nestjs/common';
import { createKibanRuntimeConfig, type KibanRuntimeConfig } from '@kiban/config';
import type { Environment, Project } from '@kiban/core';

export interface DomainBuildInput {
  readonly project: Pick<Project, 'name'>;
  readonly environment: Pick<Environment, 'slug' | 'name'>;
  readonly service: { readonly id: string; readonly name: string };
}

export const KIBAN_RUNTIME_CONFIG = 'KIBAN_RUNTIME_CONFIG';

const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'service';
};

/** Centralizes public host and URL generation for runtime-managed services. */
@Injectable()
export class DomainService {
  private readonly config: KibanRuntimeConfig;

  public constructor(@Optional() @Inject(KIBAN_RUNTIME_CONFIG) config?: KibanRuntimeConfig) {
    this.config = config ?? createKibanRuntimeConfig();
  }

  /** Builds the hostname for a service without callers concatenating domains manually. */
  public buildHost(input: DomainBuildInput): string {
    const baseDomain = this.baseDomainFor(input.environment);
    return `${slugify(input.service.id || input.service.name)}.${slugify(input.environment.slug || input.environment.name)}.${slugify(input.project.name)}.${baseDomain}`;
  }

  /** Builds the browser URL for a service. */
  public buildUrl(input: DomainBuildInput): string {
    return `${this.config.protocol}://${this.buildHost(input)}`;
  }

  /** Returns the configured public URL protocol. */
  public protocol(): 'http' | 'https' {
    return this.config.protocol;
  }

  private baseDomainFor(environment: Pick<Environment, 'slug' | 'name'>): string {
    const key = slugify(environment.slug || environment.name);
    return this.config.domains[key] ?? this.config.domains.development;
  }
}
