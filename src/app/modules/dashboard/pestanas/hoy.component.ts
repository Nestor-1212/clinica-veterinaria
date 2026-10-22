import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Cita, Consulta } from '../../../core/models';
import { CitasService } from '../../../core/services/citas.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { citasDelDia, enlaceWhatsApp, esInasistencia, porCobrarHoy, recordatoriosVacuna, siguienteDiaHabil, Recordatorio } from '../../../core/utils/metricas';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';
import { KpiComponent } from '../../../shared/components/kpi/kpi.component';
import { DatosDashboard, ICONO_ESPECIE, enDias, entero, moneda, plural } from '../dashboard-datos';

const ESTADO_TEXTO: Record<Cita['estado'], string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Atendida', cancelada: 'Cancelada', inmediata: 'Inmediata'
};
const ESTADO_CLASE: Record<Cita['estado'], string> = {
  pendiente: 'vs-status--warning', confirmada: 'vs-status--success', completada: 'vs-status--info', cancelada: 'vs-status--danger', inmediata: 'vs-status--accent'
};

/** Pestaña "Hoy": la jornada en curso para quien atiende o recibe pacientes. */
@Component({
  selector: 'app-dashboard-hoy',
  imports: [RouterLink, DatePipe, NgTemplateOutlet, MatIcon, MatButton, EdadPipe, KpiComponent],
  templateUrl: './hoy.component.html',
  styleUrls: ['./pestanas.scss', './agenda.scss', './hoy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HoyComponent {
  private router = inject(Router);
  private citasService = inject(CitasService);
  private snack = inject(MatSnackBar);

  readonly datos = input.required<DatosDashboard>();
  /** Citas confirmadas en esta sesión (actualiza la lista sin recargar). */
  private readonly confirmadas = signal<Set<string>>(new Set());
  /** El veterinario ve primero sus citas; puede cambiar a toda la clínica. */
  readonly soloMias = signal(true);

  readonly ESTADO_TEXTO = ESTADO_TEXTO;
  readonly ESTADO_CLASE = ESTADO_CLASE;
  readonly ICONO_ESPECIE = ICONO_ESPECIE;
  readonly enDias = enDias;

  readonly esVet = computed(() => this.datos().rol === 'veterinario');
  readonly puedeConsultar = computed(() => puedeAcceder(this.datos().rol, 'consultas'));
  readonly ahora = computed(() => {
    const h = this.datos().hoy;
    return `${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`;
  });

  private readonly todasHoy = computed(() => citasDelDia(this.datos().citas, this.datos().hoy));
  readonly agenda = computed(() => {
    const d = this.datos();
    const lista = this.esVet() && this.soloMias() ? this.todasHoy().filter(c => c.veterinarioId === d.usuarioId) : this.todasHoy();
    return lista.filter(c => c.estado !== 'cancelada');
  });
  /** Posición de la línea "Ahora" en la agenda. */
  readonly indiceAhora = computed(() => {
    const i = this.agenda().findIndex(c => c.hora >= this.ahora() && c.estado !== 'completada');
    return i === -1 ? this.agenda().length : i;
  });

  readonly resumen = computed(() => {
    const a = this.agenda();
    const atendidas = a.filter(c => c.estado === 'completada').length;
    const porLlegar = a.filter(c => (c.estado === 'pendiente' || c.estado === 'confirmada') && !this.noLlego(c)).length;
    const noLlegaron = a.filter(c => this.noLlego(c)).length;
    const inmediatas = a.filter(c => c.estado === 'inmediata').length;
    return { total: a.length, atendidas, porLlegar, noLlegaron, inmediatas };
  });
  /** "3 atendidas · 2 por llegar · 1 no llegó" (inasistencias solo si las hay). */
  readonly ayudaCitas = computed(() => {
    const r = this.resumen();
    return `${plural(r.atendidas, 'atendida')} · ${r.porLlegar} por llegar` + (r.noLlegaron ? ` · ${r.noLlegaron} ${r.noLlegaron === 1 ? 'no llegó' : 'no llegaron'}` : '');
  });
  /** La primera cita por atender después de la línea "Ahora": se destaca en la agenda. */
  readonly siguiente = computed(() => {
    const c = this.agenda()[this.indiceAhora()];
    return c && c.estado !== 'completada' && !this.noLlego(c) ? c : null;
  });

  readonly manana = computed(() => siguienteDiaHabil(this.datos().hoy));
  /** "mañana" si el siguiente día hábil es mañana; si no, su nombre ("el lunes 26"). */
  readonly cuandoManana = computed(() => {
    const m = this.manana();
    const diferencia = Math.round((m.getTime() - new Date(this.datos().hoy).setHours(0, 0, 0, 0)) / 86400000);
    return diferencia === 1 ? 'mañana' : 'el ' + m.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric' });
  });
  /** Atenciones de hoy con el pago pendiente: a quién cobrar antes de que se vaya. */
  readonly cobrarHoy = computed(() => porCobrarHoy(this.datos().pagos, this.datos().hoy));
  readonly totalCobrarHoy = computed(() => this.cobrarHoy().reduce((s, p) => s + p.total, 0));
  readonly porConfirmar = computed(() =>
    citasDelDia(this.datos().citas, this.manana()).filter(c => c.estado === 'pendiente' && !this.confirmadas().has(c.id)));

  /** Citas del veterinario el siguiente día hábil (para preparar la jornada). */
  readonly mananaMias = computed(() =>
    citasDelDia(this.datos().citas, this.manana()).filter(c => c.veterinarioId === this.datos().usuarioId && c.estado !== 'cancelada'));

  /** Vacunas vencidas (hasta 60 días) o que vencen en los próximos 7: a quién llamar hoy. */
  readonly avisos = computed(() => {
    const d = this.datos();
    return recordatoriosVacuna(d.vacunas, d.mascotas, d.clientes, d.hoy, 7, 60);
  });

  readonly proximo = computed(() => {
    if (!this.esVet()) return null;
    const d = this.datos();
    const mias = this.todasHoy().filter(c => c.veterinarioId === d.usuarioId);
    const cita = mias.find(c => c.estado === 'inmediata') ?? mias.find(c => (c.estado === 'confirmada' || c.estado === 'pendiente') && c.hora >= this.restar(this.ahora(), 30));
    if (!cita) return null;
    const mascota = d.mascota.get(cita.mascotaId);
    const ultima = d.consultas
      .filter((c: Consulta) => c.mascotaId === cita.mascotaId && new Date(c.fecha) < d.hoy)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    return { cita, mascota, cliente: d.cliente.get(cita.clienteId), ultima };
  });

  readonly entero = entero;
  readonly moneda = moneda;
  readonly plural = plural;

  nombreMascota(id: string): string { return this.datos().mascota.get(id)?.nombre ?? 'Mascota'; }
  especie(id: string): string { return ICONO_ESPECIE[this.datos().mascota.get(id)?.tipo ?? 'Otro']; }
  nombreCliente(id: string): string { return this.datos().cliente.get(id)?.nombre ?? 'Cliente'; }
  telefono(id: string): string { return this.datos().cliente.get(id)?.telefono ?? ''; }
  nombreVet(id: string): string {
    const u = this.datos().usuario.get(id);
    return u ? `${u.nombre} ${u.apellido.charAt(0)}.` : '';
  }

  /** La hora de la cita ya pasó y sigue sin atender: el paciente no llegó. */
  noLlego(cita: Cita): boolean {
    return esInasistencia(cita, this.datos().hoy);
  }

  iniciarConsulta(cita: Cita): void {
    this.router.navigate(['/consultas/nueva'], { queryParams: { citaId: cita.id, mascotaId: cita.mascotaId, clienteId: cita.clienteId } });
  }

  confirmar(cita: Cita): void {
    this.citasService.update(cita.id, { estado: 'confirmada' });
    this.confirmadas.update(s => new Set(s).add(cita.id));
    this.snack.open(`Cita de ${this.nombreMascota(cita.mascotaId)} confirmada`, 'Cerrar', { duration: 3000 });
  }

  whatsappConfirmar(cita: Cita): string | null {
    return enlaceWhatsApp(this.telefono(cita.clienteId),
      `Hola ${this.nombreCliente(cita.clienteId)}, le escribimos de la clínica veterinaria para confirmar la cita de ${this.nombreMascota(cita.mascotaId)} ${this.cuandoManana()} a las ${cita.hora}. ¿Nos confirma su asistencia?`);
  }

  whatsappVacuna(r: Recordatorio): string | null {
    const fecha = new Date(r.vacuna.proximaFecha).toLocaleDateString('es-PA', { day: 'numeric', month: 'long' });
    const texto = r.dias < 0
      ? `a ${r.mascota.nombre} le correspondía la vacuna ${r.vacuna.nombre} el ${fecha}`
      : `a ${r.mascota.nombre} le corresponde la vacuna ${r.vacuna.nombre} el ${fecha}`;
    return enlaceWhatsApp(r.cliente.telefono, `Hola ${r.cliente.nombre}, le escribimos de la clínica veterinaria: ${texto}. ¿Le agendamos una cita?`);
  }

  /** "en 13 min", "en 1 h 20 min" o "ahora" desde la hora actual hasta `hora`. */
  faltan(hora: string): string {
    const min = this.minutos(hora) - this.minutos(this.ahora());
    if (min <= 0) return 'ahora';
    if (min < 60) return `en ${min} min`;
    return `en ${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
  }

  tel(telefono: string): string { return `tel:+507${telefono.replace(/\D/g, '')}`; }

  private minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private restar(hora: string, minutos: number): string {
    const [h, m] = hora.split(':').map(Number);
    const t = Math.max(0, h * 60 + m - minutos);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }
}
