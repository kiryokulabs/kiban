export class SystemMetricsPresenter {
  public percentLabel(percent: number): string {
    return `${Math.round(percent)}%`;
  }

  public percentWidth(percent: number): number {
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  public statusClass(percent: number): string {
    if (percent >= 85) return 'bg-red-500 shadow-red-500/30';
    if (percent >= 65) return 'bg-amber-400 shadow-amber-400/30';
    return 'bg-emerald-400 shadow-emerald-400/30';
  }

  public bytesLabel(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Math.max(0, bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const formatted = value >= 10 || Number.isInteger(value) ? Math.round(value).toString() : value.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
  }

  public metricTitle(label: string, totalBytes: number, usedBytes: number, usagePercent: number): string {
    return `${label}: ${this.bytesLabel(usedBytes)} used of ${this.bytesLabel(totalBytes)}, ${this.percentLabel(usagePercent)}`;
  }

  public localIpLabel(localIp: string | null): string {
    return localIp ?? 'IP unavailable';
  }
}
