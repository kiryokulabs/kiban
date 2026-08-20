import { describe, expect, it, vi } from 'vitest';
import { API_PREFIX, apiPort, configureHttpApplication, type HttpApplication } from './main';

describe('API bootstrap HTTP configuration', () => {
  it('keeps every HTTP endpoint behind the /api prefix', async () => {
    const app = {
      register: vi.fn(async () => undefined),
      enableCors: vi.fn(),
      setGlobalPrefix: vi.fn()
    } as unknown as HttpApplication;

    await configureHttpApplication(app);

    expect(API_PREFIX).toBe('api');
    expect(app.setGlobalPrefix).toHaveBeenCalledWith(API_PREFIX);
    expect(app.enableCors).toHaveBeenCalledWith({ origin: true, credentials: true });
  });

  it('uses port 3000 by default for packaged runtime compatibility', () => {
    expect(apiPort({})).toBe(3000);
  });

  it('allows local development to move the API away from occupied ports', () => {
    expect(apiPort({ KIBAN_API_PORT: '3100' })).toBe(3100);
  });
});
