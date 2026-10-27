import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { Pago } from '../../../core/models';
import { METODO_ICONO, METODO_TEXTO, cierreDeCaja, conceptoPago, fechaCobro } from '../../../core/utils/pagos';
import { aCsv, descargarCsv, fechaArchivo } from '../../../core/utils/csv';

/**
 * Cierre de caja del día: cuánto entró por cada método (el efectivo es lo que debe haber en la
 * gaveta), qué se anuló y qué quedó pendiente, con el detalle para cuadrar y exportarlo a CSV.
 */
@Component({
  selector: 'app-cierre-caja',
  templateUrl: './cierre-caja.component.html',
  styleUrl: './cierre-caja.component.scss',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatIconButton, MatIcon, DatePipe]
})
export class CierreCajaComponent {
  private pagosService = inject(PagosService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);

  readonly METODO_TEXTO = METODO_TEXTO;
  readonly METODO_ICONO = METODO_ICONO;
  private readonly hoy = new Date();
  readonly dia = signal(new Date(this.hoy.getFullYear(), this.hoy.getMonth(), this.hoy.getDate()));
  readonly cierre = computed(() => cierreDeCaja(this.pagosService.getAll(), this.dia()));
  readonly esHoy = computed(() => this.dia().toDateString() === this.hoy.toDateString());

  moverDia(d: number): void {
    const n = new Date(this.dia());
    n.setDate(n.getDate() + d);
    if (n <= this.hoy) this.dia.set(n);
  }

  moneda(v: number): string { return '$' + v.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  hora(p: Pago): string { return fechaCobro(p).toTimeString().slice(0, 5); }
  cliente(p: Pago): string { return this.clientesService.getById(p.clienteId)?.nombre ?? '-'; }
  mascota(p: Pago): string { return this.mascotasService.getById(p.mascotaId)?.nombre ?? '-'; }
  concepto(p: Pago): string { return conceptoPago(p); }

  exportar(): void {
    const c = this.cierre();
    const filas = c.cobros.map(p => [fechaArchivo(fechaCobro(p)), this.hora(p), this.cliente(p), this.mascota(p),
      p.items.map(i => i.descripcion).join(' + '), METODO_TEXTO[p.metodoPago], p.referencia ?? '', p.total]);
    const resumen = c.porMetodo.map(m => ['', '', '', '', `Total ${METODO_TEXTO[m.metodo]} (${m.cantidad})`, METODO_TEXTO[m.metodo], '', m.total]);
    descargarCsv(`cierre-de-caja-${fechaArchivo(c.dia)}`, aCsv(
      ['Fecha', 'Hora', 'Cliente', 'Mascota', 'Conceptos', 'Método', 'Referencia', 'Total'],
      [...filas, [], ...resumen, ['', '', '', '', 'Total del día', '', '', c.total]]
    ));
  }
}
