import { Component, Input, ViewEncapsulation, computed, signal, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * Renders trusted SVG markup loaded from Kiban catalog files.
 *
 * This component is intentionally small and dependency-free. It should only be
 * used for SVG strings that originate from the local Kiban catalog, never for
 * arbitrary user-provided HTML.
 */
@Component({
  selector: 'kiban-svg-icon',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .kiban-svg-icon {
      display: inline-grid;
      width: 1.5rem;
      height: 1.5rem;
      place-items: center;
      overflow: hidden;
      line-height: 0;
    }

    .kiban-svg-icon svg {
      display: block;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }
  `],
  template: `<span class="kiban-svg-icon" [innerHTML]="safeSvg()"></span>`
})
export class SvgIconComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly svgMarkup = signal('');

  /** Raw SVG markup from the local catalog icon.svg file. */
  @Input({ required: true }) public set svg(value: string) {
    this.svgMarkup.set(value);
  }

  /** Trusted SVG markup for Angular innerHTML rendering. */
  protected readonly safeSvg = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.svgMarkup()));
}
