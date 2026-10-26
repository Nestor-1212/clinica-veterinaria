import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { CobrarService } from '../../pagos/cobro-dialog/cobrar.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { CitasService } from '../../../core/services/citas.service';
import { PagosService } from '../../../core/services/pagos.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Cliente, Mascota, Pago } from '../../../core/models';
import { enlaceWhatsApp, momentoCita } from '../../../core/utils/metricas';
import {
  EstadoVacunas, EventoHistorial, ICONO_ESPECIE, ResumenExpediente, TipoEvento, estadoVacunas, historialCliente, resumenExpediente, tiempoRelativo
} from '../../../core/utils/clientes';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { DecimalPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';

type FiltroHistorial = 'todo' | TipoEvento;

interface Estado { texto: string; clase: string; }

const ESTADOS: Record<string, Estado> = {
  'cita:pendiente': { texto: 'Pendiente', clase: 'vs-status--warning' },
  'cita:confirmada': { texto: 'Confirmada', clase: 'vs-status--success' },
  'cita:completada': { texto: 'Atendida', clase: 'vs-status--neutral' },
  'cita:cancelada': { texto: 'Cancelada', clase: 'vs-status--neutral' },
  'cita:inmediata': { texto: 'Inmediata', clase: 'vs-status--accent' },
  'consulta:inmediata': { texto: 'Atención inmediata', clase: 'vs-status--accent' },
  'pago:pagado': { texto: 'Pagado', clase: 'vs-status--success' },
  'pago:pendiente': { texto: 'Pendiente', clase: 'vs-status--warning' },
  'pago:anulado': { texto: 'Anulado', clase: 'vs-status--neutral' }
};

const TIPO: Record<TipoEvento, { icono: string; texto: string }> = {
  consulta: { icono: 'medical_services', texto: 'Consulta' },
  cita: { icono: 'event', texto: 'Cita' },
  pago: { icono: 'payments', texto: 'Pago' },
  vacuna: { icono: 'vaccines', texto: 'Vacuna' }
};

/** Cuántos eventos del historial se muestran antes de "Mostrar más". */
const PASO_HISTORIAL = 12;

@Component({
    selector: 'app-detalle-cliente',
    templateUrl: './detalle-cliente.component.html',
    styleUrls: ['./detalle-cliente.component.scss', './historial.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, NgTemplateOutlet, DecimalPipe, DatePipe, EdadPipe]
})
export class DetalleClienteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private citasService = inject(CitasService);
  private pagosService = inject(PagosService);
  private vacunasService = inject(VacunasService);
  private cobrarService = inject(CobrarService);

  /** Dinero (pagos, saldo, cobrar) solo para quien cobra: admin y recepción. */
  readonly verPagos = puedeAcceder(this.auth.currentUser?.rol, 'pagos');
  readonly ICONO_ESPECIE = ICONO_ESPECIE;
  readonly relativo = tiempoRelativo;
  readonly momentoCita = momentoCita;

  cliente!: Cliente;
  mascotas: Mascota[] = [];
  hoy = new Date();
  resumen!: ResumenExpediente;
  vacunas = new Map<string, EstadoVacunas>();
  private nombreMascota = new Map<string, string>();
  private eventos: EventoHistorial[] = [];
  proximos: EventoHistorial[] = [];
  private pasados: EventoHistorial[] = [];
  filtros: { valor: FiltroHistorial; texto: string; cuenta: number }[] = [];
  filtro: FiltroHistorial = 'todo';
  limite = PASO_HISTORIAL;
  grupos: { mes: string; eventos: EventoHistorial[] }[] = [];
  totalFiltrados = 0;

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const c = this.clientesService.getById(id);
    if (!c) { this.router.navigate(['/clientes']); return; }
    this.cliente = c;
    this.cargar();
  }

  private cargar(): void {
    const id = this.cliente.id;
    this.hoy = new Date();
    this.mascotas = this.mascotasService.getByCliente(id);
    const consultas = this.consultasService.getByCliente(id);
    const citas = this.citasService.getByCliente(id);
    const pagos = this.verPagos ? this.pagosService.getByCliente(id) : [];
    const vacunas = this.vacunasService.getAll().filter(v => v.clienteId === id);

    this.resumen = resumenExpediente(consultas, citas, pagos, this.hoy);
    this.nombreMascota = new Map(this.mascotasService.getAll().filter(m => m.clienteId === id).map(m => [m.id, m.nombre]));
    this.vacunas = new Map(this.mascotas.map(m => [m.id, estadoVacunas(vacunas, m.id, this.hoy)]));
    this.eventos = historialCliente(citas, consultas, pagos, vacunas, this.hoy);
    this.proximos = this.eventos.filter(e => e.futuro).reverse();
    this.pasados = this.eventos.filter(e => !e.futuro);

    const cuenta = (t: TipoEvento) => this.pasados.filter(e => e.tipo === t).length;
    this.filtros = [
      { valor: 'todo', texto: 'Todo', cuenta: this.pasados.length },
      { valor: 'consulta', texto: 'Consultas', cuenta: cuenta('consulta') },
      { valor: 'cita', texto: 'Citas', cuenta: cuenta('cita') },
      { valor: 'vacuna', texto: 'Vacunas', cuenta: cuenta('vacuna') },
      ...(this.verPagos ? [{ valor: 'pago' as const, texto: 'Pagos', cuenta: cuenta('pago') }] : [])
    ];
    this.agrupar();
  }

  /** Eventos visibles agrupados por mes ("octubre de 2026"); se recalcula al cambiar filtro o límite. */
  private agrupar(): void {
    const filtrados = this.filtro === 'todo' ? this.pasados : this.pasados.filter(e => e.tipo === this.filtro);
    this.totalFiltrados = filtrados.length;
    this.grupos = [];
    for (const e of filtrados.slice(0, this.limite)) {
      const mes = e.fecha.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
      const ultimo = this.grupos[this.grupos.length - 1];
      if (ultimo?.mes === mes) ultimo.eventos.push(e); else this.grupos.push({ mes, eventos: [e] });
    }
  }

  elegirFiltro(f: FiltroHistorial): void {
    this.filtro = f;
    this.limite = PASO_HISTORIAL;
    this.agrupar();
  }

  mostrarMas(): void {
    this.limite += PASO_HISTORIAL * 2;
    this.agrupar();
  }

  tipo(e: EventoHistorial): { icono: string; texto: string } { return TIPO[e.tipo]; }

  mascota(id: string): string { return this.nombreMascota.get(id) ?? 'Mascota'; }

  estado(e: EventoHistorial): Estado | null {
    return e.estado ? ESTADOS[`${e.tipo}:${e.estado}`] ?? null : null;
  }

  tel(telefono: string): string { return `tel:+507${telefono.replace(/\D/g, '')}`; }

  get whatsapp(): string | null {
    return enlaceWhatsApp(this.cliente.telefono, `Hola ${this.cliente.nombre}, le escribimos de la clínica veterinaria.`);
  }

  conceptoPago(p: Pago): string {
    return p.items.map(i => i.descripcion).filter(Boolean).join(', ') || 'Cobro';
  }

  /** Mismo flujo que en Pagos: panel de cobro con método, referencia, cambio y deshacer. */
  cobrar(pago: Pago): void {
    const mascota = this.mascotas.find(m => m.id === pago.mascotaId)?.nombre ?? '';
    this.cobrarService.cobrar(pago, this.cliente.nombre, mascota, () => this.cargar())
      .subscribe(ok => { if (ok) this.cargar(); });
  }

  nuevaMascota(): void {
    this.router.navigate(['/mascotas/nueva'], { queryParams: { clienteId: this.cliente.id } });
  }

  nuevaCita(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.cliente.id } });
  }

  nuevaAtencion(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.cliente.id, tipo: 'inmediata' } });
  }
}
