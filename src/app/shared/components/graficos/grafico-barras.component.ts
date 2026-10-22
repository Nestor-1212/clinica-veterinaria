import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface Barra {
  etiqueta: string;
  valor: number;
  /** Texto secundario junto al valor, p. ej. "42 %" o "3 cobros". */
  detalle?: string;
  /** Marca de atención (p. ej. cobros de más de 30 días): icono + texto, nunca solo color. */
  alerta?: string;
}

/**
 * Barras horizontales de una sola serie, de mayor a menor, con el valor en la punta.
 * Es una lista semántica: cada fila se lee completa por lector de pantalla.
 */
@Component({
  selector: 'app-grafico-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="barras" [attr.aria-label]="titulo()">
      @for (b of datos(); track b.etiqueta) {
        <li class="fila">
          <span class="etiqueta">{{ b.etiqueta }}</span>
          <span class="pista" aria-hidden="true">
            <span class="barra" [class.barra--alerta]="b.alerta" [style.width.%]="max() ? (b.valor / max()) * 100 : 0"></span>
          </span>
          <span class="valor">
            <strong>{{ formato()(b.valor) }}</strong>
            @if (b.detalle) { <span class="detalle">{{ b.detalle }}</span> }
          </span>
          @if (b.alerta) {
            <span class="alerta"><span class="alerta-icono" aria-hidden="true">!</span>{{ b.alerta }}</span>
          }
        </li>
      }
    </ul>
  `,
  styles: [`
    :host { display: block; }
    .barras { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--vs-space-3); }
    .fila { display: grid; grid-template-columns: minmax(96px, 30%) 1fr auto; align-items: center; gap: var(--vs-space-3); font-size: 14px; }
    .etiqueta { color: var(--vs-text); }
    .pista { height: 12px; }
    .barra { display: block; height: 100%; min-width: 2px; background: var(--vs-chart-1); border-radius: 0 4px 4px 0; }
    .barra--alerta { background: var(--vs-warning); }
    .valor { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; font-variant-numeric: tabular-nums;
      strong { font-weight: 600; color: var(--vs-text); } }
    .detalle { font-size: 12px; color: var(--vs-text-muted); }
    .alerta { grid-column: 2 / -1; display: inline-flex; align-items: center; gap: 6px; margin-top: -6px; font-size: 12px; font-weight: 600; color: var(--vs-on-warning-container); }
    .alerta-icono { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; background: var(--vs-warning-container); font-size: 11px; font-weight: 700; }
  `]
})
export class GraficoBarrasComponent {
  readonly datos = input.required<Barra[]>();
  readonly titulo = input.required<string>();
  readonly formato = input<(v: number) => string>(v => String(v));
  readonly max = computed(() => Math.max(...this.datos().map(d => d.valor), 0));
}
