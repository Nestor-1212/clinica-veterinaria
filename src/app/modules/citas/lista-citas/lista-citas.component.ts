import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Cita, Cliente, EstadoCita, Mascota, TipoMascota, Usuario } from '../../../core/models';
import {
  ESTADO_CLASE, ESTADO_TEXTO, ResumenDia, celda, citasPorConfirmar, mensajeRecordatorio, resumenDelDia, tableroDelDia, tramoDe, tramosDelDia
} from '../../../core/utils/agenda';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { enlaceWhatsApp, inicioDia, mismoDia, momentoCita } from '../../../core/utils/metricas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatAnchor } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatMenuTrigger, MatMenu, MatMenuItem, MatMenuContent } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { MatDatepicker, MatDatepickerInput } from '@angular/material/datepicker';
import { DatePipe } from '@angular/common';

export type VistaCitas = 'agenda' | 'confirmar' | 'historial';

interface GrupoDia { dia: Date; citas: Cita[]; }

@Component({
    selector: 'app-lista-citas',
    templateUrl: './lista-citas.component.html',
    styleUrls: ['./lista-citas.component.scss', './tablero.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatSelect, MatOption, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatMenuTrigger, MatMenu, MatMenuItem, MatMenuContent, MatDivider, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatDatepicker, MatDatepickerInput, DatePipe]
})
export class ListaCitasComponent implements OnInit, AfterViewInit {
  private citasService = inject(CitasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly ESTADO_TEXTO = ESTADO_TEXTO;
  readonly ESTADO_CLASE = ESTADO_CLASE;
  readonly tramos = tramosDelDia();
  readonly puedeConsultar = puedeAcceder(this.auth.currentUser?.rol, 'consultas');
  readonly yo = this.auth.currentUser?.id;

  vista: VistaCitas = 'agenda';
  dia = inicioDia(new Date());
  ahora = new Date();
  veterinarios: Usuario[] = [];
  private citas: Cita[] = [];
  private mascotas = new Map<string, Mascota>();
  private clientes = new Map<string, Cliente>();

  tablero = new Map<string, Cita[]>();
  resumen: ResumenDia = { total: 0, porConfirmar: 0, confirmadas: 0, enEspera: 0, atendidas: 0, noLlegaron: 0 };
  /** Citas del día en orden (vista de lista en móvil). */
  delDia: Cita[] = [];
  citasPorVet: Record<string, number> = {};
  porConfirmar: GrupoDia[] = [];
  totalPorConfirmar = 0;

  // Historial
  displayedColumns = ['fecha', 'paciente', 'veterinario', 'motivo', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Cita>();
  filtroEstado: EstadoCita | '' = '';
  readonly estadosFiltro: EstadoCita[] = ['pendiente', 'confirmada', 'inmediata', 'completada', 'cancelada'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    // B9: buscar por los nombres que se muestran, no por los IDs guardados en la fila.
    this.dataSource.filterPredicate = filtroPorTexto<Cita>(c => [
      this.getMascota(c.mascotaId), this.getCliente(c.clienteId), this.getVet(c.veterinarioId), c.motivo, c.estado, ESTADO_TEXTO[c.estado], c.hora
    ]);
    this.dataSource.sortingDataAccessor = (c, col) => {
      switch (col) {
        case 'paciente': return this.getMascota(c.mascotaId).toLowerCase();
        case 'veterinario': return this.getVet(c.veterinarioId).toLowerCase();
        default: return momentoCita(c).getTime();
      }
    };
    const q = this.route.snapshot.queryParams;
    if (q.vista === 'confirmar' || q.vista === 'historial') this.vista = q.vista;
    if (q.dia && !isNaN(new Date(`${q.dia}T00:00`).getTime())) this.dia = new Date(`${q.dia}T00:00`);
    this.cargar();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    this.ahora = new Date();
    this.citas = this.citasService.getAll();
    this.veterinarios = this.usuariosService.getVeterinarios();
    this.mascotas = new Map(this.mascotasService.getAll().map(m => [m.id, m]));
    this.clientes = new Map(this.clientesService.getAll().map(c => [c.id, c]));

    this.actualizarDia();
    const pendientes = citasPorConfirmar(this.citas, this.ahora);
    this.totalPorConfirmar = pendientes.length;
    const grupos = new Map<string, GrupoDia>();
    for (const c of pendientes) {
      const d = inicioDia(new Date(c.fecha));
      const k = d.toDateString();
      if (!grupos.has(k)) grupos.set(k, { dia: d, citas: [] });
      grupos.get(k)!.citas.push(c);
    }
    this.porConfirmar = [...grupos.values()];

    const historial = this.filtroEstado ? this.citas.filter(c => c.estado === this.filtroEstado) : [...this.citas];
    this.dataSource.data = historial.sort((a, b) => momentoCita(b).getTime() - momentoCita(a).getTime());
  }

  private actualizarDia(): void {
    this.tablero = tableroDelDia(this.citas, this.dia);
    this.resumen = resumenDelDia(this.citas, this.dia, this.ahora);
    this.delDia = this.citas.filter(c => c.estado !== 'cancelada' && mismoDia(c.fecha, this.dia)).sort((a, b) => a.hora.localeCompare(b.hora));
    this.citasPorVet = Object.fromEntries(this.veterinarios.map(v => [v.id, this.delDia.filter(c => c.veterinarioId === v.id).length]));
  }

  // ---------- Vista y día ----------
  elegirVista(v: VistaCitas): void {
    this.vista = v;
    this.sincronizarUrl();
  }

  moverDia(dias: number): void {
    const d = new Date(this.dia);
    d.setDate(d.getDate() + dias);
    this.irA(d);
  }

  irA(fecha: Date | null): void {
    if (!fecha) return;
    this.dia = inicioDia(fecha);
    this.actualizarDia();
    this.sincronizarUrl();
  }

  get esHoy(): boolean { return mismoDia(this.dia, this.ahora); }

  /** Tramo donde cae "ahora" (solo hoy, dentro del horario). */
  get tramoAhora(): string | null {
    if (!this.esHoy) return null;
    const t = tramoDe(`${this.ahora.getHours()}:${this.ahora.getMinutes()}`);
    return this.tramos.includes(t) ? t : null;
  }

  get horaAhora(): string {
    return `${String(this.ahora.getHours()).padStart(2, '0')}:${String(this.ahora.getMinutes()).padStart(2, '0')}`;
  }

  private sincronizarUrl(): void {
    const dia = this.esHoy ? null : fechaIso(this.dia);
    this.router.navigate([], { queryParams: { vista: this.vista === 'agenda' ? null : this.vista, dia }, replaceUrl: true });
  }

  // ---------- Tablero ----------
  citasEn(vetId: string, tramo: string): Cita[] { return this.tablero.get(celda(vetId, tramo)) ?? []; }

  /** Un hueco se puede agendar si está en el futuro. */
  puedeAgendar(tramo: string): boolean {
    if (this.dia > this.ahora) return true;
    return this.esHoy && tramo > this.horaAhora;
  }

  agendarEn(vet: Usuario, tramo: string): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { veterinarioId: vet.id, fecha: fechaIso(this.dia), hora: tramo } });
  }

  noLlego(c: Cita): boolean {
    return (c.estado === 'pendiente' || c.estado === 'confirmada') && momentoCita(c) < this.ahora;
  }

  textoEstado(c: Cita): string { return this.noLlego(c) ? 'No llegó' : ESTADO_TEXTO[c.estado]; }
  claseEstado(c: Cita): string { return this.noLlego(c) ? 'vs-status--warning' : ESTADO_CLASE[c.estado]; }

  // ---------- Datos ----------
  getCliente(id: string): string { return this.clientes.get(id)?.nombre ?? this.clientesService.getById(id)?.nombre ?? '-'; }
  getMascota(id: string): string { return this.mascotas.get(id)?.nombre ?? this.mascotasService.getById(id)?.nombre ?? '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }
  vetCorto(id: string): string {
    const v = this.veterinarios.find(x => x.id === id);
    return v ? `${v.nombre} ${v.apellido.charAt(0)}.` : this.getVet(id);
  }
  mascota(id: string): Mascota | undefined { return this.mascotas.get(id); }
  telefono(id: string): string { return this.clientes.get(id)?.telefono ?? ''; }
  especie(id: string): string { return ICONO_ESPECIE[(this.mascotas.get(id)?.tipo ?? 'Otro') as TipoMascota]; }
  tel(id: string): string { return `tel:+507${this.telefono(id).replace(/\D/g, '')}`; }

  whatsapp(c: Cita): string | null {
    return enlaceWhatsApp(this.telefono(c.clienteId), mensajeRecordatorio(c, this.mascotas.get(c.mascotaId), this.clientes.get(c.clienteId)));
  }

  /** "Hoy", "Mañana" o el día de la semana. */
  nombreDia(d: Date): string {
    const diff = Math.round((inicioDia(d).getTime() - inicioDia(this.ahora).getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    return d.toLocaleDateString('es-PA', { weekday: 'long' }).replace(/^./, l => l.toUpperCase());
  }

  // ---------- Acciones ----------
  cambiarEstado(cita: Cita, estado: EstadoCita): void {
    this.citasService.update(cita.id, { estado });
    this.cargar();
    this.snack.open(`Cita ${ESTADO_TEXTO[estado].toLowerCase()}`, 'OK', { duration: 2000 });
  }

  iniciarConsulta(cita: Cita): void {
    this.router.navigate(['/consultas/nueva'], {
      queryParams: { citaId: cita.id, mascotaId: cita.mascotaId, clienteId: cita.clienteId }
    });
  }

  /**
   * B6: cancelar una cita cambia su estado a 'cancelada' (antes la borraba físicamente y
   * dejaba consultas con citaId huérfano). El historial se conserva.
   */
  cancelar(cita: Cita): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancelar cita', message: `¿Cancelar la cita de ${this.getMascota(cita.mascotaId)}? Quedará en el historial como cancelada.`, confirmText: 'Sí, cancelar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.cambiarEstado(cita, 'cancelada'); }
    });
  }

  // ---------- Historial ----------
  elegirEstado(e: EstadoCita | ''): void {
    this.filtroEstado = e;
    this.cargar();
    this.paginator?.firstPage();
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }

  limpiarBusqueda(input: HTMLInputElement): void {
    input.value = '';
    this.dataSource.filter = '';
    input.focus();
  }

  readonly momentoCita = momentoCita;
}

/** "2026-10-23" en hora local. */
function fechaIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
