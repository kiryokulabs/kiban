import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SystemVersionProvider } from '../application/system-version.service';

const DEFAULT_VERSION_URL = 'https://get.kibanos.com/latest/VERSION';

/** Reads the installed Kiban version and the latest published release version. */
export class ReleaseVersionProvider implements SystemVersionProvider {
  public constructor(
    private readonly runtimeRoot: string,
    private readonly versionUrl: string = process.env['KIBAN_VERSION_URL'] ?? DEFAULT_VERSION_URL
  ) {}

  public getCurrentVersion(): string {
    return process.env['KIBAN_VERSION'] ?? this.getRuntimeVersion() ?? 'unknown';
  }

  public async getLatestVersion(): Promise<string | null> {
    try {
      const response = await fetch(this.versionUrl);
      if (!response.ok) return null;
      return (await response.text()).trim();
    } catch {
      return null;
    }
  }

  private getRuntimeVersion(): string | null {
    try {
      const envFile = readFileSync(join(this.runtimeRoot, '.env'), 'utf8');
      const line = envFile.split('\n').find((entry) => entry.startsWith('KIBAN_VERSION='));
      return line ? line.slice('KIBAN_VERSION='.length).trim() : null;
    } catch {
      return null;
    }
  }
}
