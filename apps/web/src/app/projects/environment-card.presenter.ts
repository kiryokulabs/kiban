import type { EnvironmentItem } from './projects.models';

/**
 * Presentation rules for environment cards.
 */
export class EnvironmentCardPresenter {
  /** Returns the human-readable description for an environment card. */
  public description(environment: EnvironmentItem): string {
    if (environment.description?.trim()) {
      return environment.description.trim();
    }

    if (environment.type === 'custom') {
      return 'Custom isolated environment for this project.';
    }

    if (environment.slug === 'development') {
      return 'Safe sandbox for local development and experiments.';
    }

    if (environment.slug === 'staging') {
      return 'Pre-production space to validate changes before release.';
    }

    if (environment.slug === 'production') {
      return 'Live environment intended for real workloads.';
    }

    return 'System environment managed by Kiban.';
  }
}
