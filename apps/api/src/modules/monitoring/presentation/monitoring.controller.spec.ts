import { describe, expect, it, vi } from 'vitest';
import { MonitoringController } from './monitoring.controller';
import type { MonitoringHistory, MonitoringOverview } from '../application/monitoring.models';
import type { MonitoringOverviewService } from '../application/monitoring-overview.service';
import type { MonitoringHistoryService } from '../application/monitoring-history.service';

const overview: MonitoringOverview = {
  host: { memory: { totalBytes: 16, usedBytes: 8, freeBytes: 8, usagePercent: 50 }, disk: { totalBytes: 100, usedBytes: 25, freeBytes: 75, usagePercent: 25 }, cpu: { usagePercent: 10 }, network: { localIp: null } },
  services: [],
  alerts: [],
  runtimeAvailable: true
};

describe('MonitoringController', () => {
  it('serves the monitoring overview', async () => {
    const overviewService = { getOverview: vi.fn(async () => overview) } as unknown as MonitoringOverviewService;
    const historyService = { getHistory: vi.fn(async (): Promise<MonitoringHistory> => ({ scope: 'host', resourceId: 'host', samples: [] })) } as unknown as MonitoringHistoryService;
    const controller = new MonitoringController(overviewService, historyService);

    await expect(controller.overview()).resolves.toEqual(overview);
  });

  it('serves history with parsed query parameters', async () => {
    const overviewService = { getOverview: vi.fn(async () => overview) } as unknown as MonitoringOverviewService;
    const getHistory = vi.fn(async (): Promise<MonitoringHistory> => ({ scope: 'host', resourceId: 'host', samples: [] }));
    const historyService: MonitoringHistoryService = { getHistory } as unknown as MonitoringHistoryService;
    const controller = new MonitoringController(overviewService, historyService);

    await controller.history('host', 'host', '48');

    expect(getHistory).toHaveBeenCalledWith('host', 'host', 48);
  });

  it('defaults the history range to 24 hours', async () => {
    const overviewService = { getOverview: vi.fn(async () => overview) } as unknown as MonitoringOverviewService;
    const getHistory = vi.fn(async (): Promise<MonitoringHistory> => ({ scope: 'host', resourceId: 'host', samples: [] }));
    const historyService: MonitoringHistoryService = { getHistory } as unknown as MonitoringHistoryService;
    const controller = new MonitoringController(overviewService, historyService);

    await controller.history('host', 'host', undefined);

    expect(getHistory).toHaveBeenCalledWith('host', 'host', 24);
  });
  it('passes invalid explicit hour ranges through for service validation', async () => {
    const overviewService = { getOverview: vi.fn(async () => overview) } as unknown as MonitoringOverviewService;
    const getHistory = vi.fn(async (): Promise<MonitoringHistory> => ({ scope: 'host', resourceId: 'host', samples: [] }));
    const historyService: MonitoringHistoryService = { getHistory } as unknown as MonitoringHistoryService;
    const controller = new MonitoringController(overviewService, historyService);

    await controller.history('host', 'host', '24abc');
    await controller.history('host', 'host', '1.5');

    expect(getHistory).toHaveBeenNthCalledWith(1, 'host', 'host', Number.NaN);
    expect(getHistory).toHaveBeenNthCalledWith(2, 'host', 'host', 1.5);
  });

});
