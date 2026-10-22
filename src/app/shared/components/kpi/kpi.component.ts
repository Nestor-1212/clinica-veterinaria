import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
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

/** Tono de una cifra que pide acción: 'atencion' (naranja) o 'alerta' (rojo). */
export type TonoKpi = 'atencion' | 'alerta' | null;

/**
 * Cifra del dashboard: etiqueta, valor, comparación opcional y ayuda, sin caja propia.
 * Va dentro de una banda (filetes entre cifras) o de un escenario. `hero` la convierte en
 * la cifra protagonista de la vista (una sola por vista). Un valor "0" se retira (gris);
 * `tono` resalta la que requiere acción con un punto y color, siempre junto al texto.
 * Si recibe `enlace`, la cifra entera es un enlace operable con teclado.
 */
@Component({
  selector: 'app-kpi',
  imports: [RouterLink, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.hero]': 'hero()' },
  template: `
    @if (enlace(); as ruta) {
      <a class="kpi kpi--enlace" [class]="clases()" [routerLink]="ruta" [queryParams]="parametros()"><ng-container *ngTemplateOutlet="cuerpo" /></a>
    } @else {
      <div class="kpi" [class]="clases()"><ng-container *ngTemplateOutlet="cuerpo" /></div>
    }
    <ng-template #cuerpo>
      <span class="etiqueta">
        @if (tono()) { <span class="punto" aria-hidden="true"></span> }
        {{ etiqueta() }}
        @if (enlace()) { <mat-icon class="ir" aria-hidden="true">arrow_forward</mat-icon> }
      </span>
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
    :host { display: block; min-width: 0; }
    .kpi { display: grid; align-content: start; gap: 2px; height: 100%; color: inherit; text-decoration: none; border-radius: var(--vs-radius-sm); }
    .kpi--enlace { outline-offset: 6px; }
    .kpi--enlace:hover .etiqueta { color: var(--vs-primary); }
    .kpi--enlace:hover .ir { opacity: 1; transform: translateX(2px); }
    .etiqueta { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 18px; font-weight: 600; color: var(--vs-text-secondary);
      transition: color var(--vs-dur-fast) var(--vs-ease); }
    .ir { font-size: 16px; width: 16px; height: 16px; opacity: .55; transition: opacity var(--vs-dur-fast) var(--vs-ease), transform var(--vs-dur-fast) var(--vs-ease); }
    .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--vs-accent); }
    .valor { margin-top: 2px; font: var(--vs-text-figure); letter-spacing: -0.02em; color: var(--vs-text); }
    .delta { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 2px; font-size: 13px; font-weight: 600; color: var(--vs-text-secondary);
      mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .delta--bien { color: var(--vs-on-success-container); }
    .delta--mal { color: var(--vs-on-danger-container); }
    .contra { margin-left: 4px; font-weight: 400; color: var(--vs-text-muted); }
    .ayuda { font-size: 13px; line-height: 18px; color: var(--vs-text-muted); }

    /* Cifra protagonista */
    :host(.hero) .valor { margin-top: 4px; font: var(--vs-text-hero); letter-spacing: var(--vs-tracking-hero); }
    :host(.hero) .etiqueta { font-size: 14px; color: var(--vs-text); }
    :host(.hero) .delta { margin-top: 4px; font-size: 14px; }

    /* Lo rutinario se retira; lo urgente destaca */
    .kpi--cero .valor { color: var(--vs-text-muted); }
    .kpi--atencion .valor { color: var(--vs-accent-text); }
    .kpi--alerta .valor { color: var(--vs-danger); }
    .kpi--alerta .punto { background: var(--vs-danger); }

    @media (max-width: 600px) { :host(.hero) .valor { font: var(--vs-text-hero-sm); letter-spacing: var(--vs-tracking-hero); } }
    @media (prefers-reduced-motion: reduce) { .etiqueta, .ir { transition: none; } }
  `]
})
export class KpiComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly delta = input<DeltaKpi | null>(null);
  readonly ayuda = input<string>('');
  readonly enlace = input<string | null>(null);
  readonly parametros = input<Record<string, string> | null>(null);
  readonly hero = input(false, { transform: booleanAttribute });
  readonly tono = input<TonoKpi>(null);

  readonly clases = computed(() => {
    const t = this.tono();
    return [this.enlace() ? 'kpi kpi--enlace' : 'kpi', t ? 'kpi--' + t : '', !t && this.valor() === '0' ? 'kpi--cero' : ''].join(' ');
  });

  /** true favorable, false desfavorable, null sin cambio. */
  readonly favorable = computed(() => {
    const d = this.delta();
    if (!d || d.porcentaje === 0) return null;
    return (d.porcentaje > 0) === d.subirEsBueno;
  });
}
