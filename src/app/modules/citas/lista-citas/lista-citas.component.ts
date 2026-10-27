import { Component, OnInit, ViewChild, inject, AfterViewInit, ElementRef } from '@angular/core';
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
  private host = inject(ElementRef, { optional: true });
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

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.irAAhora();
  }

  /** Hoy, la agenda abre desplazada a la línea "Ahora" (no a las 07:00 ya pasadas). */
  private irAAhora(): void {
    if (this.vista !== 'agenda' || !this.esHoy || typeof document === 'undefined') return;
    setTimeout(() => this.host?.nativeElement.querySelector('.tablero .ahora')?.scrollIntoView({ block: 'center' }));
  }

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
    this.calcularEntrada();
    this.calcularPasadas();
    this.proximosHuecos = this.veterinarios.map(v => ({
      vet: v,
      tramos: this.tramos.filter(t => this.puedeAgendar(t) && !this.citasEn(v.id, t).length).slice(0, 4)
    })).filter(x => x.tramos.length);
  }

  // ---------- Horas pasadas sin citas (hoy) ----------
  /** Tramos de hoy ya pasados y sin ninguna cita: se pliegan en una línea para que el tablero empiece en lo que importa. */
  tramosPasadosVacios = new Set<string>();
  verPasadas = false;

  private calcularPasadas(): void {
    const ahora = this.tramoAhora;
    this.tramosPasadosVacios = new Set(ahora
      ? this.tramos.filter(t => t < ahora && this.veterinarios.every(v => !this.citasEn(v.id, t).length))
      : []);
  }

  ocultarTramo(t: string): boolean { return !this.verPasadas && this.tramosPasadosVacios.has(t); }

  get textoPasadas(): string {
    const minutos = this.tramosPasadosVacios.size * 30;
    const duracion = minutos < 60 ? `${minutos} min` : `${String(minutos / 60).replace('.', ',')} h`;
    return `${duracion} pasadas sin citas`;
  }

  // ---------- Teclado en el tablero (un solo Tab entra; las flechas recorren) ----------
  /** Elemento del tablero que recibe el Tab: "tramo,vet,orden". */
  entrada = '';
  /** Próximos huecos libres por veterinario (móvil, donde no hay tablero). */
  proximosHuecos: { vet: Usuario; tramos: string[] }[] = [];

  private calcularEntrada(): void {
    const desde = Math.max(0, this.tramoAhora ? this.tramos.indexOf(this.tramoAhora) : 0);
    const buscar = (ini: number, fin: number) => {
      for (let ti = ini; ti < fin; ti++) {
        for (let vi = 0; vi < this.veterinarios.length; vi++) {
          const t = this.tramos[ti];
          if (this.citasEn(this.veterinarios[vi].id, t).length || this.puedeAgendar(t)) return `${ti},${vi},0`;
        }
      }
      return '';
    };
    this.entrada = buscar(desde, this.tramos.length) || buscar(0, desde);
  }

  esEntrada(ti: number, vi: number, k: number): boolean { return this.entrada === `${ti},${vi},${k}`; }

  navegarTablero(ev: KeyboardEvent): void {
    const flechas = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const actual = (ev.target as HTMLElement).closest<HTMLElement>('[data-celda]');
    if (!flechas.includes(ev.key) || !actual) return;
    ev.preventDefault();
    const pos = (el: HTMLElement) => el.dataset['celda']!.split(',').map(Number);
    const [ti, vi] = pos(actual);
    const todos = Array.from((ev.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-celda]')).map(el => ({ el, p: pos(el) }));
    const orden = (a: number[], b: number[]) => a[0] - b[0] || a[2] - b[2];
    let destino: HTMLElement | undefined;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      const columna = todos.filter(x => x.p[1] === vi).sort((a, b) => orden(a.p, b.p));
      const i = columna.findIndex(x => x.el === actual);
      destino = columna[ev.key === 'ArrowDown' ? i + 1 : i - 1]?.el;
    } else {
      const otra = vi + (ev.key === 'ArrowRight' ? 1 : -1);
      const columna = todos.filter(x => x.p[1] === otra).sort((a, b) => orden(a.p, b.p));
      destino = (columna.find(x => x.p[0] >= ti) ?? columna[columna.length - 1])?.el;
    }
    if (!destino) return;
    this.entrada = destino.dataset['celda']!;
    destino.focus();
  }

  // ---------- Vista y día ----------
  elegirVista(v: VistaCitas): void {
    this.vista = v;
    this.sincronizarUrl();
    this.irAAhora();
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
    this.irAAhora();
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
