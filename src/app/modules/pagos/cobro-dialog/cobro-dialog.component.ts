import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatInput, MatHint, MatPrefix } from '@angular/material/input';
import { MetodoPago, Pago } from '../../../core/models';
import { METODO_ICONO, METODO_TEXTO, redondearCentavos } from '../../../core/utils/pagos';

export interface DatosCobro { pago: Pago; cliente: string; mascota: string; }
export interface ResultadoCobro { metodoPago: MetodoPago; referencia?: string; }

/**
 * Panel de cobro: qué se cobra, con qué paga el cliente (con su referencia) y, en efectivo,
 * cuánto cambio devolver. Devuelve el método elegido al cerrar con "Cobrar".
 */
@Component({
  selector: 'app-cobro-dialog',
  templateUrl: './cobro-dialog.component.html',
  styleUrl: './cobro-dialog.component.scss',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatIcon, MatFormField, MatLabel, MatInput, MatHint, MatPrefix]
})
export class CobroDialogComponent {
  private ref = inject<MatDialogRef<CobroDialogComponent, ResultadoCobro>>(MatDialogRef);
  readonly datos = inject<DatosCobro>(MAT_DIALOG_DATA);
  readonly metodos = Object.keys(METODO_TEXTO) as MetodoPago[];
  readonly METODO_TEXTO = METODO_TEXTO;
  readonly METODO_ICONO = METODO_ICONO;

  /** Sin método preseleccionado: hay que elegir con qué pagó de verdad el cliente. */
  readonly metodo = signal<MetodoPago | null>(null);
  readonly referencia = signal('');
  readonly recibido = signal<number | null>(null);
  readonly intentado = signal(false);

  readonly total = this.datos.pago.total;
  readonly cambio = computed(() => {
    const r = this.recibido();
    return r === null ? null : redondearCentavos(r - this.total);
  });
  readonly etiquetaReferencia = computed(() => ({
    yappy: 'Número de confirmación de Yappy', transferencia: 'Número de la transferencia', tarjeta: 'Últimos 4 dígitos o voucher', efectivo: ''
  })[this.metodo() ?? 'efectivo']);

  moneda(v: number): string { return '$' + v.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  elegir(m: MetodoPago): void {
    this.metodo.set(m);
    this.referencia.set('');
    this.recibido.set(null);
  }

  /** Billetes habituales para el efectivo: el total exacto y los siguientes redondos. */
  get billetes(): number[] {
    const t = this.total;
    return [...new Set([t, Math.ceil(t / 5) * 5, Math.ceil(t / 10) * 10, Math.ceil(t / 20) * 20, Math.ceil(t / 50) * 50])].filter(v => v >= t).slice(0, 4);
  }

  alEscribirRecibido(ev: Event): void {
    const v = parseFloat((ev.target as HTMLInputElement).value);
    this.recibido.set(isNaN(v) ? null : v);
  }

  cobrar(): void {
    this.intentado.set(true);
    const m = this.metodo();
    if (!m) return;
    if (m === 'efectivo' && this.cambio() !== null && this.cambio()! < 0) return;
    this.ref.close({ metodoPago: m, referencia: this.referencia().trim() || undefined });
  }
}
