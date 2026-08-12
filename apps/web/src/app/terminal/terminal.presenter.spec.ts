import { describe, expect, it } from 'vitest';
import { TerminalPresenter } from './terminal.presenter';
import type { RuntimeContainer } from '../installed-services/installed-services.models';

const container = (overrides?: Partial<RuntimeContainer>): RuntimeContainer => ({
  id: 'abc123',
  name: 'supabase',
  status: 'running',
  health: 'healthy',
  image: 'supabase/postgres:15',
  restartCount: 0,
  ...overrides
});

describe('TerminalPresenter', () => {
  const presenter = new TerminalPresenter();

  describe('friendlyName', () => {
    it('returns the container name as-is when it is already friendly', () => {
      expect(presenter.friendlyName(container({ name: 'supabase' }))).toBe('supabase');
    });

    it('strips the project prefix from Docker Compose container names', () => {
      expect(presenter.friendlyName(container({ name: 'kiban-env-1-supabase-supabase-1' }))).toBe('supabase');
    });

    it('strips a different project prefix format', () => {
      expect(presenter.friendlyName(container({ name: 'kiban-9ee18496-f62a-4df1-a77e-1cf22d65bcb7-postgres-postgres-1' }))).toBe('postgres');
    });

    it('handles single-replica containers without trailing number', () => {
      expect(presenter.friendlyName(container({ name: 'kiban-dev-myapp-myapp' }))).toBe('myapp');
    });

    it('returns the full name when no project prefix is detected', () => {
      expect(presenter.friendlyName(container({ name: 'custom-service' }))).toBe('custom-service');
    });

    it('handles names with multiple hyphens in the service part', () => {
      expect(presenter.friendlyName(container({ name: 'kiban-prod-redis-cache-1' }))).toBe('redis-cache');
    });
  });

  describe('containerOptions', () => {
    it('maps containers to selectable options with friendly names', () => {
      const containers = [
        container({ id: 'c1', name: 'kiban-env-supabase-supabase-1' }),
        container({ id: 'c2', name: 'kiban-env-postgres-postgres-1' })
      ];

      expect(presenter.containerOptions(containers)).toEqual([
        { id: 'c1', label: 'supabase' },
        { id: 'c2', label: 'postgres' }
      ]);
    });

    it('returns empty array when no containers', () => {
      expect(presenter.containerOptions([])).toEqual([]);
    });

    it('preserves container ID for selection', () => {
      const containers = [container({ id: 'unique-id-123', name: 'web' })];
      const options = presenter.containerOptions(containers);
      expect(options[0]?.id).toBe('unique-id-123');
    });
  });

  describe('selectContainer', () => {
    it('returns the first container ID when none is selected', () => {
      const containers = [
        container({ id: 'c1', name: 'supabase' }),
        container({ id: 'c2', name: 'postgres' })
      ];
      expect(presenter.selectContainer(containers, null)).toBe('c1');
    });

    it('keeps the current selection if it still exists', () => {
      const containers = [
        container({ id: 'c1', name: 'supabase' }),
        container({ id: 'c2', name: 'postgres' })
      ];
      expect(presenter.selectContainer(containers, 'c2')).toBe('c2');
    });

    it('falls back to first container when current selection no longer exists', () => {
      const containers = [
        container({ id: 'c1', name: 'supabase' }),
        container({ id: 'c2', name: 'postgres' })
      ];
      expect(presenter.selectContainer(containers, 'deleted-id')).toBe('c1');
    });

    it('returns null when no containers', () => {
      expect(presenter.selectContainer([], null)).toBeNull();
    });
  });

  describe('connectionStateLabel', () => {
    it('returns Disconnected when not connected', () => {
      expect(presenter.connectionStateLabel('disconnected')).toBe('Disconnected');
    });

    it('returns Connecting when connecting', () => {
      expect(presenter.connectionStateLabel('connecting')).toBe('Connecting…');
    });

    it('returns Connected when connected', () => {
      expect(presenter.connectionStateLabel('connected')).toBe('Connected');
    });

    it('returns Connection error on error', () => {
      expect(presenter.connectionStateLabel('error')).toBe('Connection error');
    });

    it('returns Session expired on timeout', () => {
      expect(presenter.connectionStateLabel('timeout')).toBe('Session expired');
    });
  });

  describe('integration', () => {
    const containers: readonly RuntimeContainer[] = [
      container({ id: 'c1', name: 'kiban-env-supabase-supabase-1' }),
      container({ id: 'c2', name: 'kiban-env-redis-redis-1' }),
      container({ id: 'c3', name: 'nginx' })
    ];

    it('builds a complete set of options from runtime containers', () => {
      const options = presenter.containerOptions(containers);
      expect(options).toHaveLength(3);
      expect(options.map((o) => o.label)).toEqual(['supabase', 'redis', 'nginx']);
    });

    it('auto-selects the first container when none is chosen', () => {
      expect(presenter.selectContainer(containers, null)).toBe('c1');
    });

    it('falls back to first container after a container is removed', () => {
      const reduced = containers.slice(0, 2);
      expect(presenter.selectContainer(reduced, 'c3')).toBe('c1');
    });
  });
});
