import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DockerComposeRuntimeProvider, type ComposeCommandRunner } from './docker-compose-runtime.provider';

interface RunnerCall { readonly command: string; readonly args: readonly string[]; readonly cwd: string; }

const psRow = (overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> => ({
  ID: 'abc123',
  Names: '/kiban-env-1-postgres-1',
  Image: 'postgres:16',
  State: 'running',
  Status: 'Up 2 hours (healthy)',
  Labels: 'com.docker.compose.project=kiban-env-1-postgres,com.docker.compose.service=postgres',
  ...overrides
});

const statsRow = (overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> => ({
  ID: 'abc123',
  Name: 'kiban-env-1-postgres-1',
  CPUPerc: '1.53%',
  MemUsage: '100MiB / 1GiB',
  MemPerc: '9.77%',
  NetIO: '10kB / 20kB',
  BlockIO: '0B / 0B',
  PIDs: '5',
  ...overrides
});

class FleetStatsRunner implements ComposeCommandRunner {
  public readonly calls: RunnerCall[] = [];
  public psStdout = [JSON.stringify(psRow()), JSON.stringify(psRow({ ID: 'def456', Names: '/kiban-env-1-redis-1', Status: 'Up 3 hours', Labels: 'com.docker.compose.project=kiban-env-1-redis' }))].join('\n');
  public statsStdout = [JSON.stringify(statsRow()), JSON.stringify(statsRow({ ID: 'def456', Name: 'kiban-env-1-redis-1', CPUPerc: '0.20%', MemUsage: '50MiB / 512MiB', NetIO: '1kB / 2kB' }))].join('\n');
  public inspectStdout = '/kiban-env-1-postgres-1|2|2026-09-10T09:00:00.000Z\n/kiban-env-1-redis-1|0|2026-09-10T08:00:00.000Z\n';
  public failOn: string | null = null;

  public async run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<{ readonly stdout: string; readonly stderr: string }> {
    this.calls.push({ command, args, cwd: options.cwd });
    if (this.failOn !== null && args.includes(this.failOn)) throw new Error('docker engine is not reachable');
    if (args.includes('ps')) return { stdout: this.psStdout, stderr: '' };
    if (args.includes('stats')) return { stdout: this.statsStdout, stderr: '' };
    if (args[0] === 'inspect') return { stdout: this.inspectStdout, stderr: '' };
    return { stdout: '', stderr: '' };
  }
}

const createProvider = async (runner: ComposeCommandRunner): Promise<DockerComposeRuntimeProvider> => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'kiban-fleet-'));
  return DockerComposeRuntimeProvider.withRunner(runner, runtimeRoot);
};

describe('DockerComposeRuntimeProvider.fleetStats', () => {
  it('returns aggregated stats for every compose container', async () => {
    const runner = new FleetStatsRunner();
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    expect(stats.available).toBe(true);
    expect(stats.message).toBeNull();
    expect(stats.units).toHaveLength(2);
    const postgres = stats.units.find((unit) => unit.runtimeUnitName === 'kiban-env-1-postgres-1');
    expect(postgres).toBeDefined();
    expect(postgres!.runtimeUnitId).toBe('abc123');
    expect(postgres!.projectName).toBe('kiban-env-1-postgres');
    expect(postgres!.state).toBe('running');
    expect(postgres!.health).toBe('healthy');
    expect(postgres!.cpuPercent).toBe(1.53);
    expect(postgres!.memoryUsedBytes).toBe(104_857_600);
    expect(postgres!.memoryLimitBytes).toBe(1_073_741_824);
    expect(postgres!.networkRxBytes).toBe(10_000);
    expect(postgres!.networkTxBytes).toBe(20_000);
    expect(postgres!.restartCount).toBe(2);
    expect(postgres!.startedAt).toBe('2026-09-10T09:00:00.000Z');
  });

  it('skips containers that are not managed by a compose project', async () => {
    const runner = new FleetStatsRunner();
    runner.psStdout = [JSON.stringify(psRow()), JSON.stringify(psRow({ ID: 'xyz789', Names: '/standalone-container', Labels: '' }))].join('\n');
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    expect(stats.units.map((unit) => unit.runtimeUnitName)).toEqual(['kiban-env-1-postgres-1']);
  });

  it('parses health signals from the container status text', async () => {
    const runner = new FleetStatsRunner();
    runner.psStdout = [
      JSON.stringify(psRow({ ID: 'a1', Names: '/a-1', Status: 'Up 2 hours (unhealthy)', Labels: 'com.docker.compose.project=p-a' })),
      JSON.stringify(psRow({ ID: 'b2', Names: '/b-1', Status: 'Up 2 minutes (starting)', Labels: 'com.docker.compose.project=p-b' })),
      JSON.stringify(psRow({ ID: 'c3', Names: '/c-1', Status: 'Exited (1) 5 minutes ago', State: 'exited', Labels: 'com.docker.compose.project=p-c' }))
    ].join('\n');
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    const healthByName = new Map(stats.units.map((unit) => [unit.runtimeUnitName, unit.health]));
    expect(healthByName.get('a-1')).toBe('unhealthy');
    expect(healthByName.get('b-1')).toBe('starting');
    expect(healthByName.get('c-1')).toBe('unknown');
  });

  it('reports null stats for containers missing from the stats output', async () => {
    const runner = new FleetStatsRunner();
    runner.statsStdout = '';
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    expect(stats.units).toHaveLength(2);
    expect(stats.units.every((unit) => unit.cpuPercent === null && unit.memoryUsedBytes === null)).toBe(true);
  });

  it('returns an empty available fleet when no compose containers exist', async () => {
    const runner = new FleetStatsRunner();
    runner.psStdout = '';
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    expect(stats.available).toBe(true);
    expect(stats.units).toEqual([]);
  });

  it('returns an unavailable fleet when the runtime engine cannot be reached', async () => {
    const runner = new FleetStatsRunner();
    runner.failOn = 'ps';
    const provider = await createProvider(runner);

    const stats = await provider.fleetStats();

    expect(stats.available).toBe(false);
    expect(stats.units).toEqual([]);
    expect(stats.message).toContain('unavailable');
  });

  it('uses safe argument arrays without shell interpolation', async () => {
    const runner = new FleetStatsRunner();
    const provider = await createProvider(runner);

    await provider.fleetStats();

    for (const call of runner.calls) {
      expect(call.command).toBe('docker');
      expect(call.args.every((arg) => typeof arg === 'string')).toBe(true);
    }
    const statsCall = runner.calls.find((call) => call.args[0] === 'stats');
    expect(statsCall!.args).toEqual(['stats', '--no-stream', '--format', 'json', 'abc123', 'def456']);
    const inspectCall = runner.calls.find((call) => call.args[0] === 'inspect');
    expect(inspectCall!.args).toContain('{{.Name}}|{{.RestartCount}}|{{.State.StartedAt}}');
  });
});
