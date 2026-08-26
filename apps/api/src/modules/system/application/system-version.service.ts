import { Inject, Injectable } from '@nestjs/common';
export interface SystemVersionInfo {
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly updateAvailable: boolean;
  readonly checkedAt: string;
}

export interface SystemVersionProvider {
  getCurrentVersion(): string;
  getLatestVersion(): Promise<string | null>;
}

export const SYSTEM_VERSION_PROVIDER = Symbol('SYSTEM_VERSION_PROVIDER');

/** Compares the installed Kiban version with the latest published release. */
@Injectable()
export class SystemVersionService {
  public constructor(@Inject(SYSTEM_VERSION_PROVIDER) private readonly provider: SystemVersionProvider) {}

  public async getVersion(): Promise<SystemVersionInfo> {
    const currentVersion = normalizeVersion(this.provider.getCurrentVersion()) || 'unknown';
    const latestVersion = normalizeVersion(await this.provider.getLatestVersion());

    return {
      currentVersion,
      latestVersion,
      updateAvailable: isNewerVersion(latestVersion, currentVersion),
      checkedAt: new Date().toISOString()
    };
  }
}

const normalizeVersion = (version: string | null): string | null => {
  if (version === null) return null;
  const trimmed = version.trim().replace(/^v/i, '');
  return trimmed.length > 0 ? trimmed : null;
};

const parseVersion = (version: string | null): readonly number[] | null => {
  if (version === null || version === 'unknown') return null;
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const isNewerVersion = (candidate: string | null, current: string): boolean => {
  const latestParts = parseVersion(candidate);
  const currentParts = parseVersion(current);
  if (!latestParts || !currentParts) return false;

  for (let index = 0; index < latestParts.length; index += 1) {
    const latest = latestParts[index] ?? 0;
    const installed = currentParts[index] ?? 0;
    if (latest > installed) return true;
    if (latest < installed) return false;
  }

  return false;
};
