import { describe, expect, it } from 'vitest';
import { TerminalPresenter } from './terminal.presenter';
import type { RuntimeContainer } from '../installed-services/installed-services.models';

describe('TerminalComponent behavior', () => {
  const presenter = new TerminalPresenter();

  const containers: readonly RuntimeContainer[] = [
    { id: 'c1', name: 'kiban-env-supabase-supabase-1', status: 'running', health: 'healthy', image: 'supabase/postgres:15', restartCount: 0 },
    { id: 'c2', name: 'kiban-env-redis-redis-1', status: 'running', health: 'healthy', image: 'redis:7', restartCount: 0 }
  ];

  it('derives container options from runtime containers', () => {
    const options = presenter.containerOptions(containers);
    expect(options).toEqual([
      { id: 'c1', label: 'supabase' },
      { id: 'c2', label: 'redis' }
    ]);
  });

  it('defaults to first container when none selected', () => {
    expect(presenter.selectContainer(containers, null)).toBe('c1');
  });

  it('does not select stopped containers for terminal connection', () => {
    expect(presenter.selectContainer([{ ...containers[0]!, status: 'exited' }], null)).toBeNull();
  });

  it('switches to a running container after the selected container stops', () => {
    const updated: readonly RuntimeContainer[] = [
      { ...containers[0]!, status: 'exited' },
      containers[1]!
    ];

    expect(presenter.selectContainer(updated, 'c1')).toBe('c2');
  });

  it('preserves existing selection across re-renders', () => {
    expect(presenter.selectContainer(containers, 'c2')).toBe('c2');
  });

  it('shows disconnected state before WebSocket connects', () => {
    expect(presenter.connectionStateLabel('disconnected')).toBe('Disconnected');
  });

  it('shows connecting while WebSocket is establishing', () => {
    expect(presenter.connectionStateLabel('connecting')).toBe('Connecting…');
  });

  it('shows connected when terminal is ready', () => {
    expect(presenter.connectionStateLabel('connected')).toBe('Connected');
  });

  it('shows error when connection fails', () => {
    expect(presenter.connectionStateLabel('error')).toBe('Connection error');
  });

  it('shows timeout when session expires', () => {
    expect(presenter.connectionStateLabel('timeout')).toBe('Session expired');
  });

  it('returns empty options for empty container list', () => {
    expect(presenter.containerOptions([])).toEqual([]);
  });

  it('returns null selection for empty container list', () => {
    expect(presenter.selectContainer([], null)).toBeNull();
  });
});
