import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { formatDay, formatNumber, fromIsoDay } from '../../core/format';

export interface ChartPoint {
  /** Jour « AAAA-MM-JJ ». */
  date: string;
  value: number;
  /** Précision affichée dans l'infobulle (« 8 reps », « 4 séries »). */
  detail?: string;
}

interface PlacedPoint extends ChartPoint {
  index: number;
  x: number;
  y: number;
}

const MARGIN = { top: 16, right: 20, bottom: 30, left: 48 };

/**
 * Courbe d'une seule série dans le temps : un point par séance, axe horizontal proportionnel aux dates.
 * Survol ou appui : repère vertical et infobulle sur le point le plus proche.
 * La série étant unique, il n'y a pas de légende : le titre posé par la page la nomme.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (geometry(); as g) {
      <svg [attr.width]="g.width" [attr.height]="g.height" role="img" [attr.aria-label]="label()">
        @for (tick of g.yTicks; track tick.value) {
          <line class="grid" [attr.x1]="g.plotLeft" [attr.x2]="g.plotRight" [attr.y1]="tick.y" [attr.y2]="tick.y" />
          <text class="tick" [attr.x]="g.plotLeft - 8" [attr.y]="tick.y" dy="0.32em" text-anchor="end">
            {{ tick.label }}
          </text>
        }
        @for (tick of g.xTicks; track tick.x) {
          <text class="tick" [attr.x]="tick.x" [attr.y]="g.height - 8" [attr.text-anchor]="tick.anchor">
            {{ tick.label }}
          </text>
        }

        @if (active(); as point) {
          <line class="cross" [attr.x1]="point.x" [attr.x2]="point.x" [attr.y1]="g.plotTop" [attr.y2]="g.plotBottom" />
        }

        <path class="line" [attr.d]="g.path" />
        @for (point of g.points; track point.index) {
          <circle
            class="dot"
            [class.dot--active]="active()?.index === point.index"
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            [attr.r]="active()?.index === point.index ? 6 : 4"
          />
        }

        <rect
          class="hit"
          [attr.x]="0"
          [attr.y]="0"
          [attr.width]="g.width"
          [attr.height]="g.height"
          (pointermove)="onPointer($event)"
          (pointerdown)="onPointer($event)"
          (pointerleave)="activeIndex.set(null)"
        />
      </svg>

      @if (active(); as point) {
        <div
          class="tip"
          [class.tip--below]="point.y < 84"
          [style.left.px]="tipLeft(point.x, g.width)"
          [style.top.px]="point.y"
        >
          <span class="tip__date">{{ day(point.date) }}</span>
          <span class="tip__value">{{ number(point.value) }} {{ unit() }}</span>
          @if (point.detail) {
            <span class="tip__detail">{{ point.detail }}</span>
          }
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      height: 280px;
    }

    svg {
      display: block;
      touch-action: pan-y;
    }

    .grid {
      stroke: var(--line);
      stroke-width: 1;
    }

    .tick {
      fill: var(--ink-faint);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .cross {
      stroke: var(--border-control);
      stroke-width: 1;
    }

    .line {
      fill: none;
      stroke: var(--accent-fill);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    // Anneau couleur de surface : les points restent lisibles là où ils se touchent.
    .dot {
      fill: var(--accent-fill);
      stroke: var(--surface-200);
      stroke-width: 2;
    }

    .dot--active {
      fill: var(--ink);
    }

    .hit {
      fill: transparent;
    }

    .tip {
      position: absolute;
      transform: translate(-50%, calc(-100% - 14px));
      display: grid;
      gap: 1px;
      padding: var(--space-2) var(--space-3);
      background: var(--surface-400);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-raised);
      pointer-events: none;
      white-space: nowrap;
      text-align: center;
    }

    .tip--below {
      transform: translate(-50%, 14px);
    }

    .tip__date,
    .tip__detail {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }

    .tip__value {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--text-lg);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class LineChart {
  /** Points du plus ancien au plus récent. */
  readonly points = input.required<ChartPoint[]>();
  readonly unit = input('');
  /** Description lue par les lecteurs d'écran. */
  readonly label = input('Courbe de progression');

  protected readonly activeIndex = signal<number | null>(null);
  private readonly width = signal(0);
  private readonly height = signal(280);

  protected readonly day = formatDay;
  protected readonly number = formatNumber;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const measure = () => {
      this.width.set(Math.floor(host.clientWidth));
      this.height.set(Math.floor(host.clientHeight));
    };
    // Première mesure dès le rendu : l'observateur n'est servi qu'à la prochaine image affichée.
    afterNextRender(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected readonly geometry = computed(() => {
    const width = this.width();
    const height = this.height();
    const points = this.points();
    if (width < 120 || points.length === 0) return null;

    const plotLeft = MARGIN.left;
    const plotRight = width - MARGIN.right;
    const plotTop = MARGIN.top;
    const plotBottom = height - MARGIN.bottom;

    const times = points.map((p) => fromIsoDay(p.date).getTime());
    const minTime = Math.min(...times);
    const span = Math.max(...times) - minTime;
    const x = (time: number) =>
      span === 0 ? (plotLeft + plotRight) / 2 : plotLeft + ((time - minTime) / span) * (plotRight - plotLeft);

    const scale = niceScale(
      Math.min(...points.map((p) => p.value)),
      Math.max(...points.map((p) => p.value)),
    );
    const y = (value: number) =>
      plotBottom - ((value - scale.min) / (scale.max - scale.min)) * (plotBottom - plotTop);

    const placed: PlacedPoint[] = points.map((p, index) => ({ ...p, index, x: x(times[index]), y: y(p.value) }));

    return {
      width,
      height,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      points: placed,
      path: placed.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      yTicks: scale.ticks.map((value) => ({ value, y: y(value), label: formatNumber(value) })),
      xTicks: dateTicks(placed, plotRight - plotLeft),
    };
  });

  protected readonly active = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : (this.geometry()?.points[index] ?? null);
  });

  protected onPointer(event: PointerEvent): void {
    const points = this.geometry()?.points;
    if (!points) return;
    const pointerX = event.offsetX;
    let nearest = points[0];
    for (const point of points) {
      if (Math.abs(point.x - pointerX) < Math.abs(nearest.x - pointerX)) nearest = point;
    }
    this.activeIndex.set(nearest.index);
  }

  /** Garde l'infobulle dans le cadre. */
  protected tipLeft(x: number, width: number): number {
    return Math.min(Math.max(x, 72), width - 72);
  }
}

/** Bornes et graduations « rondes » (pas de 1, 2, 2,5 ou 5 × 10ⁿ) autour des valeurs. */
export function niceScale(min: number, max: number): { min: number; max: number; ticks: number[] } {
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;

  const low = Math.max(0, Math.floor(min / step) * step);
  const high = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 1000; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return { min: low, max: high, ticks };
}

/** Quelques dates sous l'axe : la première, la dernière et celles qui tiennent entre les deux sans se toucher. */
function dateTicks(points: PlacedPoint[], plotWidth: number) {
  const wanted = Math.max(2, Math.min(points.length, Math.floor(plotWidth / 96)));
  const indexes = new Set<number>();
  for (let i = 0; i < wanted; i++) {
    indexes.add(Math.round((i * (points.length - 1)) / Math.max(1, wanted - 1)));
  }

  const kept: PlacedPoint[] = [];
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const point = points[index];
    if (kept.length > 0 && point.x - kept[kept.length - 1].x < 72) {
      if (index !== points.length - 1 || kept.length === 1) continue;
      kept.pop(); // la dernière date prime sur sa voisine
    }
    kept.push(point);
  }

  return kept.map((point) => ({
    x: point.x,
    label: formatDay(point.date),
    anchor: points.length === 1 ? 'middle' : point.index === 0 ? 'start' : point.index === points.length - 1 ? 'end' : 'middle',
  }));
}
