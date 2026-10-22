import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

/** Comparación contra un periodo nombrado. */
export interface DeltaKpi {
  porcentaje: number;
  /** Periodo de referencia, p. ej. "vs. 1–22 sep". */
  contra: string;
  /** true si subir es bueno (ingresos); false si subir es malo (cancelaciones). */
  subirEsBueno: boolean;
}

/**
 * Indicador: etiqueta, valor, comparación opcional y ayuda. Si recibe `enlace`, la
 * tarjeta entera es un enlace operable con teclado.
 */
@Component({
  selector: 'app-kpi',
  imports: [RouterLink, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enlace(); as ruta) {
      <a class="kpi kpi--enlace" [routerLink]="ruta" [queryParams]="parametros()"><ng-container *ngTemplateOutlet="cuerpo" /></a>
    } @else {
      <div class="kpi"><ng-container *ngTemplateOutlet="cuerpo" /></div>
    }
    <ng-template #cuerpo>
      <span class="etiqueta">{{ etiqueta() }}</span>
      <span class="valor">{{ valor() }}</span>
      @if (delta(); as d) {
        <span class="delta" [class.delta--bien]="favorable()" [class.delta--mal]="favorable() === false">
          <mat-icon aria-hidden="true">{{ d.porcentaje > 0 ? 'arrow_upward' : d.porcentaje < 0 ? 'arrow_downward' : 'remove' }}</mat-icon>
          {{ d.porcentaje > 0 ? '+' : '' }}{{ d.porcentaje }} % <span class="contra">{{ d.contra }}</span>
        </span>
      }
      @if (ayuda()) {
        <span class="ayuda">{{ ayuda() }}</span>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .kpi {
      display: grid; align-content: start; gap: 4px; height: 100%; padding: var(--vs-space-4) var(--vs-space-5);
      background: var(--vs-surface); border: 1px solid var(--vs-border); border-radius: var(--vs-radius-md);
      color: inherit; text-decoration: none;
    }
    .kpi--enlace { transition: border-color var(--vs-dur-fast) var(--vs-ease), box-shadow var(--vs-dur-fast) var(--vs-ease);
      &:hover { border-color: var(--vs-primary); box-shadow: var(--vs-shadow-2); } }
    .etiqueta { font-size: 13px; font-weight: 500; color: var(--vs-text-secondary); }
    .valor { font-size: 28px; line-height: 36px; font-weight: 700; letter-spacing: -0.01em; color: var(--vs-text); }
    .delta { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 2px; font-size: 13px; font-weight: 600; color: var(--vs-text-secondary);
      mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .delta--bien { color: var(--vs-on-success-container); }
    .delta--mal { color: var(--vs-on-danger-container); }
    .contra { margin-left: 4px; font-weight: 400; color: var(--vs-text-muted); }
    .ayuda { font-size: 13px; color: var(--vs-text-muted); }
    @media (prefers-reduced-motion: reduce) { .kpi--enlace { transition: none; } }
  `]
})
export class KpiComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly delta = input<DeltaKpi | null>(null);
  readonly ayuda = input<string>('');
  readonly enlace = input<string | null>(null);
  readonly parametros = input<Record<string, string> | null>(null);

  /** true favorable, false desfavorable, null sin cambio. */
  readonly favorable = computed(() => {
    const d = this.delta();
    if (!d || d.porcentaje === 0) return null;
    return (d.porcentaje > 0) === d.subirEsBueno;
  });
}
