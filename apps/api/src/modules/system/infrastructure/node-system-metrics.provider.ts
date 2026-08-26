import os from 'node:os';
import checkDiskSpace from 'check-disk-space';
import systemInformation from 'systeminformation';
import type { SystemMetrics, ResourceUsageMetrics } from '../application/system-metrics.service';

export interface CpuTimesSnapshot {
  readonly idle: number;
  readonly total: number;
}

export interface DiskSpaceSnapshot {
  readonly size: number;
  readonly free: number;
}

export interface MemorySnapshot {
  readonly total: number;
  readonly available: number;
}

export interface NetworkAddressSnapshot {
  readonly address: string;
  readonly family: string;
  readonly internal: boolean;
}

export interface SystemRuntimeReader {
  memory(): Promise<MemorySnapshot>;
  diskSpace(path: string): Promise<DiskSpaceSnapshot>;
  cpuTimes(): readonly CpuTimesSnapshot[];
  networkAddresses(): readonly NetworkAddressSnapshot[];
  wait(milliseconds: number): Promise<void>;
}

const CPU_SAMPLE_DELAY_MS = 100;

export const nodeSystemRuntimeReader: SystemRuntimeReader = {
  memory: async () => {
    const memory = await systemInformation.mem();
    return { total: memory.total, available: memory.available };
  },
  diskSpace: async (path: string) => checkDiskSpace(path),
  cpuTimes: () => os.cpus().map((cpu) => {
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return { idle: cpu.times.idle, total };
  }),
  networkAddresses: () => Object.values(os.networkInterfaces()).flatMap((addresses) => addresses ?? []).map((address) => ({
    address: address.address,
    family: address.family,
    internal: address.internal
  })),
  wait: async (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
};

export class NodeSystemMetricsProvider {
  public constructor(
    private readonly diskPath: string,
    private readonly reader: SystemRuntimeReader = nodeSystemRuntimeReader
  ) {}

  /** Reads host memory, disk, CPU usage and local network address from Node/system APIs. */
  public async getMetrics(): Promise<SystemMetrics> {
    const [memory, disk, cpu] = await Promise.all([this.memoryMetrics(), this.diskMetrics(), this.cpuMetrics()]);

    return {
      memory,
      disk,
      cpu: { usagePercent: cpu },
      network: { localIp: this.localIp() }
    };
  }

  private async memoryMetrics(): Promise<ResourceUsageMetrics> {
    const memory = await this.reader.memory();
    return this.resourceMetrics(memory.total, memory.available);
  }

  private async diskMetrics(): Promise<ResourceUsageMetrics> {
    const disk = await this.reader.diskSpace(this.diskPath);
    return this.resourceMetrics(disk.size, disk.free);
  }

  private async cpuMetrics(): Promise<number> {
    const start = this.aggregateCpuTimes(this.reader.cpuTimes());
    await this.reader.wait(CPU_SAMPLE_DELAY_MS);
    const end = this.aggregateCpuTimes(this.reader.cpuTimes());

    const totalDelta = end.total - start.total;
    const idleDelta = end.idle - start.idle;
    if (totalDelta <= 0) return 0;

    return this.percent(totalDelta - idleDelta, totalDelta);
  }

  private localIp(): string | null {
    return this.reader.networkAddresses().find((address) => address.family === 'IPv4' && !address.internal)?.address ?? null;
  }

  private aggregateCpuTimes(samples: readonly CpuTimesSnapshot[]): CpuTimesSnapshot {
    return samples.reduce<CpuTimesSnapshot>(
      (total, sample) => ({ idle: total.idle + sample.idle, total: total.total + sample.total }),
      { idle: 0, total: 0 }
    );
  }

  private resourceMetrics(totalBytes: number, freeBytes: number): ResourceUsageMetrics {
    const safeTotal = Math.max(0, totalBytes);
    const safeFree = Math.max(0, Math.min(freeBytes, safeTotal));
    const usedBytes = safeTotal - safeFree;

    return {
      totalBytes: safeTotal,
      usedBytes,
      freeBytes: safeFree,
      usagePercent: this.percent(usedBytes, safeTotal)
    };
  }

  private percent(used: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((used / total) * 10_000) / 100;
  }
}
