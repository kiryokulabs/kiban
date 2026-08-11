import type { RuntimeContainer } from '../installed-services/installed-services.models';

export interface ContainerOption {
  readonly id: string;
  readonly label: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'timeout';

/**
 * Presenter for terminal UI logic.
 * Pure functions that map container data to friendly display values.
 */
export class TerminalPresenter {
  /** Returns a user-friendly name for a container, stripping Docker Compose project prefixes. */
  public friendlyName(container: RuntimeContainer): string {
    // Docker Compose format: {project}-{service}-{replica}
    // Examples:
    //   kiban-env-1-supabase-supabase-1 → supabase
    //   kiban-9ee18496-f62a-4df1-a77e-1cf22d65bcb7-postgres-postgres-1 → postgres
    //   kiban-dev-myapp-myapp → myapp
    const name = container.name;
    const segments = name.split('-');

    // Find the service name: it's the segment that repeats with the last segment (replica)
    // or the last segment if it's a number
    if (segments.length >= 3) {
      const lastSegment = segments[segments.length - 1] ?? '';
      const isReplicaNumber = /^\d+$/.test(lastSegment);

      if (isReplicaNumber && segments.length >= 4) {
        const withoutReplica = segments.slice(0, -1);
        const repeatedName = this.repeatedServiceName(withoutReplica);
        if (repeatedName) return repeatedName;
        if (withoutReplica[0] === 'kiban' && withoutReplica.length > 2) {
          return withoutReplica.slice(2).join('-');
        }
        return withoutReplica[withoutReplica.length - 1] ?? name;
      }

      // Try to find a repeating segment (service name appears twice)
      // e.g., kiban-env-supabase-supabase → supabase
      const repeatedName = this.repeatedServiceName(segments);
      if (repeatedName) return repeatedName;
    }

    return name;
  }

  private repeatedServiceName(segments: readonly string[]): string | null {
    for (let i = 1; i < segments.length - 1; i++) {
      if (segments[i] === segments[i + 1]) {
        return segments[i]!;
      }
    }
    return null;
  }

  /** Maps containers to selectable options with friendly names. */
  public containerOptions(containers: readonly RuntimeContainer[]): readonly ContainerOption[] {
    return containers.filter((container) => this.isConnectable(container)).map((c) => ({
      id: c.id,
      label: this.friendlyName(c)
    }));
  }

  /** Returns the best container ID to select given the current selection. */
  public selectContainer(containers: readonly RuntimeContainer[], currentSelection: string | null): string | null {
    const connectable = containers.filter((container) => this.isConnectable(container));
    if (connectable.length === 0) return null;
    if (currentSelection !== null && connectable.some((c) => c.id === currentSelection)) {
      return currentSelection;
    }
    return connectable[0]?.id ?? null;
  }

  /** Returns whether a runtime container can accept an interactive terminal session. */
  public isConnectable(container: RuntimeContainer): boolean {
    return container.status === 'running';
  }

  /** Returns a human-readable label for the connection state. */
  public connectionStateLabel(state: ConnectionState): string {
    switch (state) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting…';
      case 'connected': return 'Connected';
      case 'error': return 'Connection error';
      case 'timeout': return 'Session expired';
    }
  }
}
