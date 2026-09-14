import { Component, computed, input, signal } from '@angular/core';
import { MonitoringPresenter, type ChartPoint } from './monitoring.presenter';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 120;

/**
 * Lightweight SVG time-series chart.
 * Renders nothing until at least two points are available.
 * When a ceiling is provided the chart scales to it and marks it with a dashed line.
 */
@Component({
  selector: 'kiban-monitoring-chart',
  standalone: true,
  template: `
    @if (linePath()) {
      <div class="relative">
        @if (maxLabel()) {
          <span class="absolute right-0 top-0 z-10 text-[9px] c-muted">{{ maxLabel() }}</span>
        }
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          preserveAspectRatio="none"
          class="h-24 w-full text-brand"
          role="img"
          [attr.aria-label]="ariaLabel()"
          (mousemove)="showTooltip($event)"
          (mouseleave)="hideTooltip()"
        >
          <line x1="0" y1="0" [attr.x2]="width" y2="0" class="text-border" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></line>
          <path [attr.d]="areaPath()" fill="currentColor" fill-opacity="0.1"></path>
          <path [attr.d]="linePath()" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
          @if (tooltip(); as current) {
            <line [attr.x1]="current.x" y1="0" [attr.x2]="current.x" [attr.y2]="height" class="text-border" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            <circle [attr.cx]="current.x" [attr.cy]="current.y" r="4" fill="currentColor"></circle>
          }
        </svg>
        @if (tooltip(); as current) {
          <div
            class="pointer-events-none absolute top-2 z-20 min-w-28 rounded-lg border border-border bg-panel px-2.5 py-2 text-[11px] shadow-lg"
            [style.left.%]="tooltipLeftPercent()"
            [style.transform]="tooltipTransform()"
          >
            <div class="font-medium kb-text">{{ current.timeLabel }}</div>
            <div class="mt-1 c-muted">{{ label() }} {{ current.valueLabel }}</div>
            @if (current.percentLabel !== '—') {
              <div class="text-brand-light">{{ current.percentLabel }} used</div>
            }
          </div>
        }
      </div>
    }
  `
})
export class MonitoringChartComponent {
  /** Chart points ordered by time. */
  readonly points = input<readonly ChartPoint[]>([]);
  /** Value ceiling the chart scales to; falls back to the data maximum. */
  readonly max = input<number | null>(null);
  /** Tiny label describing the ceiling, rendered at the top-right. */
  readonly maxLabel = input('');
  /** Human label for the metric displayed in tooltips. */
  readonly label = input('Value');
  /** Formats raw point values for the tooltip. */
  readonly valueFormatter = input<(value: number) => string>((value) => String(value));

  protected readonly presenter = new MonitoringPresenter();
  protected readonly width = CHART_WIDTH;
  protected readonly height = CHART_HEIGHT;
  protected readonly pointerRatio = signal<number | null>(null);

  protected readonly linePath = computed(() => this.presenter.chartLinePath(this.points(), this.width, this.height, this.max() ?? undefined));
  protected readonly areaPath = computed(() => this.presenter.chartAreaPath(this.points(), this.width, this.height, this.max() ?? undefined));
  protected readonly tooltip = computed(() => {
    const ratio = this.pointerRatio();
    return ratio === null ? null : this.presenter.chartTooltip(this.points(), ratio, this.width, this.height, this.max(), this.valueFormatter());
  });
  protected readonly tooltipLeftPercent = computed(() => {
    const current = this.tooltip();
    return current ? current.x / this.width * 100 : 0;
  });
  protected readonly tooltipTransform = computed(() => {
    const left = this.tooltipLeftPercent();
    if (left < 15) return 'translateX(0)';
    if (left > 85) return 'translateX(-100%)';
    return 'translateX(-50%)';
  });
  protected readonly ariaLabel = computed(() => `${this.label()} monitoring chart`);

  protected showTooltip(event: MouseEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (rect.width <= 0) return;
    this.pointerRatio.set((event.clientX - rect.left) / rect.width);
  }

  protected hideTooltip(): void {
    this.pointerRatio.set(null);
  }
}
