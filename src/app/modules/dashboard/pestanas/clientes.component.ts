import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { ClienteSinVolver, Recordatorio, enlaceWhatsApp, recordatoriosVacuna, resumenClientes, variacion } from '../../../core/utils/metricas';
import { KpiComponent } from '../../../shared/components/kpi/kpi.component';
import { DatosDashboard, enDias, entero, plural } from '../dashboard-datos';

/** Pestaña "Clientes": a quién recuperar y a quién avisar. */
@Component({
  selector: 'app-dashboard-clientes',
  imports: [RouterLink, DatePipe, MatIcon, MatButton, KpiComponent],
  templateUrl: './clientes.component.html',
  styleUrls: ['./pestanas.scss', './clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientesComponent {
  readonly datos = input.required<DatosDashboard>();
  readonly entero = entero;
  readonly enDias = enDias;
  readonly plural = plural;

  readonly resumen = computed(() => {
    const d = this.datos();
    return resumenClientes(d.clientes, d.mascotas, d.consultas, d.citas, d.hoy);
  });
  /** Con menos de 5 altas el mes anterior, un porcentaje exagera: se muestra la diferencia absoluta. */
  readonly variacionNuevos = computed(() => {
    const r = this.resumen();
    return r.nuevosMesAnterior >= 5 ? variacion(r.nuevosMes, r.nuevosMesAnterior) : null;
  });
  readonly comparacionNuevos = computed(() => {
    const r = this.resumen();
    const mes = new Date(this.datos().hoy.getFullYear(), this.datos().hoy.getMonth() - 1, 1).toLocaleDateString('es-PA', { month: 'long' });
    if (r.nuevosMesAnterior >= 5) return `${r.nuevosMesAnterior} en ${mes}`;
    const dif = r.nuevosMes - r.nuevosMesAnterior;
    return `${dif > 0 ? '+' : ''}${dif} vs. ${mes} (${r.nuevosMesAnterior})`;
  });
  readonly vacunas = computed(() => {
    const d = this.datos();
    return recordatoriosVacuna(d.vacunas, d.mascotas, d.clientes, d.hoy, 30, 0).filter(r => r.dias >= 0);
  });
  readonly mascotasActivas = computed(() => this.datos().mascotas.filter(m => m.activo).length);

  mascotasDe(clienteId: string): string {
    return this.datos().mascotas.filter(m => m.clienteId === clienteId && m.activo).map(m => m.nombre).join(', ') || 'Sin mascotas registradas';
  }

  tel(telefono: string): string { return `tel:+507${telefono.replace(/\D/g, '')}`; }

  whatsappRecuperar(s: ClienteSinVolver): string | null {
    const quien = s.mascotas.length ? s.mascotas.join(' y ') : 'su mascota';
    return enlaceWhatsApp(s.cliente.telefono, `Hola ${s.cliente.nombre}, le escribimos de la clínica veterinaria: hace tiempo no vemos a ${quien}. ¿Le gustaría agendar un chequeo?`);
  }

  whatsappVacuna(r: Recordatorio): string | null {
    const fecha = new Date(r.vacuna.proximaFecha).toLocaleDateString('es-PA', { day: 'numeric', month: 'long' });
    return enlaceWhatsApp(r.cliente.telefono, `Hola ${r.cliente.nombre}, le escribimos de la clínica veterinaria: a ${r.mascota.nombre} le corresponde la vacuna ${r.vacuna.nombre} el ${fecha}. ¿Le agendamos una cita?`);
  }
}
