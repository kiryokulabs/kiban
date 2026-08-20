import { describe, expect, it } from 'vitest';
import { LogsService, type KibanLogsReader } from './logs.service';

describe('LogsService', () => {
  it('returns Kiban core runtime logs when the installed runtime is available', async () => {
    const service = new LogsService(reader({ available: true, logs: 'kiban-api ready\nkiban-web ready', message: null }));

    await expect(service.kiban()).resolves.toEqual({ available: true, logs: 'kiban-api ready\nkiban-web ready', message: null });
  });

  it('returns a clear unavailable response when Kiban is not installed through Docker', async () => {
    const service = new LogsService(reader({ available: false, logs: '', message: 'Kiban core runtime logs are only available for Docker-installed Kiban.' }));

    await expect(service.kiban()).resolves.toEqual({ available: false, logs: '', message: 'Kiban core runtime logs are only available for Docker-installed Kiban.' });
  });
});

const reader = (result: Awaited<ReturnType<KibanLogsReader['platformLogs']>>): KibanLogsReader => ({ platformLogs: async () => result });
