import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { ConsultasService } from '../../../core/services/consultas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { CitasService } from '../../../core/services/citas.service';
import { RecetasService } from '../../../core/services/recetas.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Cita, Cliente, Consulta, Mascota, TipoMascota } from '../../../core/models';
import { ICONO_ESPECIE, tiempoRelativo } from '../../../core/utils/clientes';
import { PeriodoConsultas, enPeriodo, evaluarTemperatura, salaDeEspera } from '../../../core/utils/consultas';
import { momentoCita } from '../../../core/utils/metricas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe } from '@angular/common';

interface OpcionPeriodo { valor: PeriodoConsultas; texto: string; }

@Component({
    selector: 'app-lista-consultas',
    templateUrl: './lista-consultas.component.html',
    styleUrls: ['./lista-consultas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe]
})
export class ListaConsultasComponent implements OnInit, AfterViewInit {
  private consultasService = inject(ConsultasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private citasService = inject(CitasService);
  private recetasService = inject(RecetasService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly yo = this.auth.currentUser;
  readonly esVet = this.yo?.rol === 'veterinario';
  readonly verRecetas = puedeAcceder(this.yo?.rol, 'recetas');
  readonly periodos: OpcionPeriodo[] = [
    { valor: 'hoy', texto: 'Hoy' }, { valor: 'semana', texto: '7 días' }, { valor: 'mes', texto: '30 días' }, { valor: 'todas', texto: 'Todas' }
  ];

  displayedColumns = ['fecha', 'paciente', 'diagnostico', 'signos', 'veterinario', 'receta', 'acciones'];
  dataSource = new MatTableDataSource<Consulta>();
  periodo: PeriodoConsultas = 'mes';
  /** Para el veterinario: solo sus consultas y su sala de espera (se puede ver todo). */
  soloMias = this.esVet;
  ahora = new Date();
  espera: Cita[] = [];
  conteos: Record<PeriodoConsultas, number> = { hoy: 0, semana: 0, mes: 0, todas: 0 };

  private todas: Consulta[] = [];
  private mascotas = new Map<string, Mascota>();
  private clientes = new Map<string, Cliente>();
  private conReceta = new Map<string, string>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Consulta>(c => [
      this.getMascota(c.mascotaId), this.getCliente(c.clienteId), this.getVet(c.veterinarioId), c.diagnostico, c.tratamiento, c.sintomas
    ]);
    this.dataSource.sortingDataAccessor = (c, col) => {
      switch (col) {
        case 'paciente': return this.getMascota(c.mascotaId).toLowerCase();
        case 'diagnostico': return (c.diagnostico || '').toLowerCase();
        default: return new Date(c.fecha).getTime();
      }
    };
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.ahora = new Date();
    this.mascotas = new Map(this.mascotasService.getAll().map(m => [m.id, m]));
    this.clientes = new Map(this.clientesService.getAll().map(c => [c.id, c]));
    this.conReceta = new Map(this.recetasService.getAll().map(r => [r.consultaId, r.id]));
    this.todas = this.consultasService.getAll()
      .filter(c => new Date(c.fecha) <= this.ahora)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.espera = salaDeEspera(this.citasService.getAll(), this.ahora, this.soloMias ? this.yo?.id : undefined);
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const base = this.soloMias ? this.todas.filter(c => c.veterinarioId === this.yo?.id) : this.todas;
    this.conteos = {
      hoy: base.filter(c => enPeriodo(c, 'hoy', this.ahora)).length,
      semana: base.filter(c => enPeriodo(c, 'semana', this.ahora)).length,
      mes: base.filter(c => enPeriodo(c, 'mes', this.ahora)).length,
      todas: base.length
    };
    this.dataSource.data = base.filter(c => enPeriodo(c, this.periodo, this.ahora));
    this.paginator?.firstPage();
  }

  elegirPeriodo(p: PeriodoConsultas): void { this.periodo = p; this.aplicarFiltros(); }
  alternarMias(): void { this.soloMias = !this.soloMias; this.cargar(); }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }

  // ---------- Datos ----------
  getMascota(id: string): string { return this.mascotas.get(id)?.nombre ?? '-'; }
  getCliente(id: string): string { return this.clientes.get(id)?.nombre ?? '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }
  vetCorto(id: string): string {
    const nombre = this.getVet(id).split(' ');
    return nombre.length > 1 ? `${nombre[0]} ${nombre[1].charAt(0)}.` : nombre[0];
  }
  mascota(id: string): Mascota | undefined { return this.mascotas.get(id); }
  especie(id: string): string { return ICONO_ESPECIE[(this.mascotas.get(id)?.tipo ?? 'Otro') as TipoMascota]; }
  recetaDe(c: Consulta): string | undefined { return this.conReceta.get(c.id); }
  relativo(fecha: Date | string): string { return tiempoRelativo(fecha, this.ahora); }

  /** "Fiebre" / "Baja" según la especie; null si es normal o no hay rango. */
  alertaTemperatura(c: Consulta): string | null {
    const e = evaluarTemperatura(c.temperatura, (this.mascotas.get(c.mascotaId)?.tipo ?? 'Otro') as TipoMascota);
    return e === 'alta' ? 'Fiebre' : e === 'baja' ? 'Baja' : null;
  }

  /** Minutos de espera de una inmediata o de retraso de una cita (null si aún no es su hora). */
  esperando(c: Cita): string | null {
    const desde = c.llegada && c.estado !== 'inmediata' ? new Date(c.llegada) : momentoCita(c);
    const min = Math.floor((this.ahora.getTime() - desde.getTime()) / 60000);
    if (min < 1) return null;
    const texto = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
    return c.estado === 'inmediata' || c.llegada ? `Espera ${texto}` : `Hace ${texto}`;
  }

  /** "Llegó 10:05" para inmediatas y citas con llegada marcada; la hora de la cita si aún no llega. */
  horaEspera(c: Cita): string {
    if (c.estado === 'inmediata') return 'Llegó ' + c.hora;
    return c.llegada ? 'Llegó ' + new Date(c.llegada).toTimeString().slice(0, 5) : c.hora;
  }

  // ---------- Acciones ----------
  atender(c: Cita): void {
    this.router.navigate(['/consultas/nueva'], { queryParams: { citaId: c.id, mascotaId: c.mascotaId, clienteId: c.clienteId } });
  }
  verHistorial(c: Consulta): void { this.router.navigate(['/mascotas', c.mascotaId]); }
  editar(c: Consulta): void { this.router.navigate(['/consultas/editar', c.id]); }
  receta(c: Consulta): void {
    const id = this.recetaDe(c);
    if (id) this.router.navigate(['/recetas', id]);
    else this.router.navigate(['/recetas/nueva'], { queryParams: { consultaId: c.id } });
  }
}
