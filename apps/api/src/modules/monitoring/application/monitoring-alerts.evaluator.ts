import type { SystemMetrics } from '../../system/application/system-metrics.service';
import type { MonitoringAlert, ServiceRuntimeMetrics } from './monitoring.models';

/** Host CPU usage percent that triggers a critical alert. */
export const HOST_CPU_ALERT_THRESHOLD = 90;
/** Host memory usage percent that triggers a critical alert. */
export const HOST_MEMORY_ALERT_THRESHOLD = 90;
/** Host disk usage percent that triggers a warning alert. */
export const HOST_DISK_ALERT_THRESHOLD = 85;

/** Returns every alert raised by the current host metrics and service states. */
export function evaluateAlerts(host: SystemMetrics, services: readonly ServiceRuntimeMetrics[]): readonly MonitoringAlert[] {
  return [...hostAlerts(host), ...services.flatMap(serviceAlerts)];
}

function hostAlerts(host: SystemMetrics): readonly MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  if (host.cpu.usagePercent > HOST_CPU_ALERT_THRESHOLD) {
    alerts.push({ id: 'host-cpu', scope: 'host', resourceId: 'host', resourceName: 'Host', severity: 'critical', message: `Host CPU usage is above ${HOST_CPU_ALERT_THRESHOLD}%.` });
  }
  if (host.memory.usagePercent > HOST_MEMORY_ALERT_THRESHOLD) {
    alerts.push({ id: 'host-memory', scope: 'host', resourceId: 'host', resourceName: 'Host', severity: 'critical', message: `Host memory usage is above ${HOST_MEMORY_ALERT_THRESHOLD}%.` });
  }
  if (host.disk.usagePercent > HOST_DISK_ALERT_THRESHOLD) {
    alerts.push({ id: 'host-disk', scope: 'host', resourceId: 'host', resourceName: 'Host', severity: 'warning', message: `Host disk usage is above ${HOST_DISK_ALERT_THRESHOLD}%.` });
  }
  return alerts;
}

function serviceAlerts(service: ServiceRuntimeMetrics): readonly MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  if (service.health === 'unhealthy') {
    alerts.push({ id: `service-${service.id}-health`, scope: 'service', resourceId: service.id, resourceName: service.name, severity: 'warning', message: `Service ${service.name} is unhealthy.` });
  }
  if (service.status === 'failed') {
    alerts.push({ id: `service-${service.id}-status`, scope: 'service', resourceId: service.id, resourceName: service.name, severity: 'critical', message: `Service ${service.name} failed to run.` });
  }
  return alerts;
}
