import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface Columna {
  etiqueta: string;
  /** Nombre completo para el tooltip y la tabla. */
  nombre: string;
  valor: number;
  /** Periodo aún abierto (mes en curso): se dibuja más claro y se rotula. */
  parcial?: boolean;
}

/** Redondea el máximo del eje a un número "limpio" (1, 2, 2.5, 5 × 10^n). */
function techoLimpio(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  for (const paso of [1, 2, 2.5, 5, 10]) if (paso * exp >= max) return paso * exp;
  return 10 * exp;
}

/**
 * Columnas de una sola serie (sin leyenda: el título de la tarjeta dice qué se mide).
 * Marcas de <= 24px con punta redondeada, rejilla de 1px recesiva, rótulos solo en el
 * máximo y en el último valor, tooltip al pasar o enfocar cada columna y vista de tabla.
 */
@Component({
  selector: 'app-grafico-columnas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!tabla()) {
      <div class="grafico" role="group" [attr.aria-label]="titulo()" [style.height.px]="alto()">
        <div class="eje">
          @for (t of ticks(); track t) {
            <span class="tick" [style.bottom.%]="(t / techo()) * 100">{{ formato()(t) }}</span>
          }
        </div>
        <div class="plot">
          @for (t of ticks(); track t) {
            <span class="linea" [style.bottom.%]="(t / techo()) * 100"></span>
          }
          @for (c of datos(); track c.etiqueta; let i = $index) {
            <div class="slot">
              <button type="button" class="col" [class.col--parcial]="c.parcial" [class.col--activa]="activa() === i"
                [style.height.%]="(c.valor / techo()) * 100"
                [attr.aria-label]="c.nombre + ': ' + formato()(c.valor) + (c.parcial ? ' (en curso)' : '')"
                (pointerenter)="activa.set(i)" (pointerleave)="activa.set(null)" (focus)="activa.set(i)" (blur)="activa.set(null)">
                @if (rotular(i)) {
                  <span class="valor">{{ formato()(c.valor) }}</span>
                }
              </button>
              @if (activa() === i) {
                <span class="tooltip" role="presentation">
                  <strong>{{ formato()(c.valor) }}</strong>
                  <span>{{ c.nombre }}{{ c.parcial ? ' · en curso' : '' }}</span>
                </span>
              }
              <span class="etiqueta">{{ c.etiqueta }}@if (c.parcial) {<span class="parcial">*</span>}</span>
            </div>
          }
        </div>
      </div>
      @if (hayParcial()) {
        <p class="nota">* {{ notaParcial() }}</p>
      }
    } @else {
      <table class="tabla">
        <caption class="sr-only">{{ titulo() }}</caption>
        <thead><tr><th scope="col">Periodo</th><th scope="col">Total</th></tr></thead>
        <tbody>
          @for (c of datos(); track c.etiqueta) {
            <tr><th scope="row">{{ c.nombre }}{{ c.parcial ? ' (en curso)' : '' }}</th><td>{{ formato()(c.valor) }}</td></tr>
          }
        </tbody>
      </table>
    }
    <button type="button" class="alternar" (click)="tabla.set(!tabla())" [attr.aria-pressed]="tabla()">
      {{ tabla() ? 'Ver como gráfico' : 'Ver como tabla' }}
    </button>
  `,
  styles: [`
    :host { display: block; }
    .grafico { display: grid; grid-template-columns: auto 1fr; gap: var(--vs-space-2); padding-top: 22px; }
    .eje { position: relative; width: 44px; margin-bottom: 24px; }
    .tick { position: absolute; right: 0; transform: translateY(50%); font-size: 12px; color: var(--vs-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .plot { position: relative; display: flex; align-items: stretch; padding-bottom: 24px; }
    .linea { position: absolute; left: 0; right: 0; height: 1px; background: var(--vs-border); transform: translateY(-24px); }
    .linea:first-child { background: var(--vs-border-strong); }
    .slot { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
    .col {
      position: relative; width: min(24px, 60%); min-height: 2px; padding: 0; border: 0; cursor: default;
      background: var(--vs-chart-1); border-radius: 4px 4px 0 0;
      transition: filter var(--vs-dur-fast) var(--vs-ease);
    }
    .col--parcial { background: var(--vs-chart-1-soft); }
    .col--activa { filter: brightness(1.12); }
    .col:focus-visible { outline: 2px solid var(--vs-focus); outline-offset: 2px; }
    .valor { position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -4px); font-size: 12px; font-weight: 600; color: var(--vs-text); white-space: nowrap; }
    .etiqueta { position: absolute; bottom: -22px; font-size: 12px; color: var(--vs-text-secondary); }
    .parcial { color: var(--vs-text-muted); }
    .tooltip {
      position: absolute; bottom: calc(100% + 8px); z-index: 2; display: grid; gap: 2px; padding: 8px 10px; white-space: nowrap;
      background: var(--vs-text); color: var(--vs-surface); border-radius: var(--vs-radius-sm); box-shadow: var(--vs-shadow-2); font-size: 12px; pointer-events: none;
      strong { font-size: 14px; }
    }
    .nota { margin: var(--vs-space-2) 0 0; font-size: 12px; color: var(--vs-text-muted); }
    .tabla { width: 100%; border-collapse: collapse; font-size: 14px;
      th, td { padding: 8px 4px; border-bottom: 1px solid var(--vs-border); text-align: left; }
      td { text-align: right; font-variant-numeric: tabular-nums; }
      thead th { font-size: 12px; color: var(--vs-text-secondary); font-weight: 600; }
      thead th:last-child { text-align: right; }
      tbody th { font-weight: 400; }
    }
    .alternar { margin-top: var(--vs-space-2); padding: 4px 0; border: 0; background: none; font: inherit; font-size: 13px; font-weight: 600; color: var(--vs-primary); cursor: pointer; text-underline-offset: 3px;
      &:hover { text-decoration: underline; } }
    @media (prefers-reduced-motion: reduce) { .col { transition: none; } }
  `]
})
export class GraficoColumnasComponent {
  readonly datos = input.required<Columna[]>();
  readonly titulo = input.required<string>();
  readonly formato = input<(v: number) => string>(v => String(v));
  readonly notaParcial = input('Mes en curso: aún no está completo.');
  /** Alto total del gráfico en px (incluye la banda del eje X). */
  readonly alto = input(200);

  readonly activa = signal<number | null>(null);
  readonly tabla = signal(false);

  readonly techo = computed(() => techoLimpio(Math.max(...this.datos().map(d => d.valor), 0)));
  readonly ticks = computed(() => [0, this.techo() / 2, this.techo()]);
  readonly hayParcial = computed(() => this.datos().some(d => d.parcial));
  private readonly indiceMax = computed(() => {
    const d = this.datos();
    return d.reduce((iMax, c, i) => (c.valor > d[iMax].valor ? i : iMax), 0);
  });

  /** Rótulo directo solo en el máximo y en el último periodo; el resto, en tooltip y tabla. */
  rotular(i: number): boolean {
    return i === this.indiceMax() || i === this.datos().length - 1;
  }
}
