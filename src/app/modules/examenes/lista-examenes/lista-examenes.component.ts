import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { ExamenesService } from '../../../core/services/examenes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cliente, Examen, Mascota, TipoMascota } from '../../../core/models';
import { ICONO_ESPECIE, tiempoRelativo } from '../../../core/utils/clientes';
import { examenPendiente } from '../../../core/utils/examenes';
import { ArchivosService } from '../../../core/services/archivos.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe } from '@angular/common';

type FiltroExamenes = 'pendientes' | 'mes' | 'todos';

@Component({
    selector: 'app-lista-examenes',
    templateUrl: './lista-examenes.component.html',
    styleUrls: ['./lista-examenes.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe]
})
export class ListaExamenesComponent implements OnInit, AfterViewInit {
  private examenesService = inject(ExamenesService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private archivosService = inject(ArchivosService);
  private snack = inject(MatSnackBar);

  readonly filtros: { valor: FiltroExamenes; texto: string }[] = [
    { valor: 'pendientes', texto: 'Pendientes de resultado' }, { valor: 'mes', texto: 'Últimos 30 días' }, { valor: 'todos', texto: 'Todos' }
  ];
  filtro: FiltroExamenes = 'pendientes';
  conteos: Record<FiltroExamenes, number> = { pendientes: 0, mes: 0, todos: 0 };
  displayedColumns = ['fecha', 'paciente', 'examen', 'resultado', 'veterinario', 'acciones'];
  dataSource = new MatTableDataSource<Examen>();
  hoy = new Date();

  private todos: Examen[] = [];
  private mascotas = new Map<string, Mascota>();
  private clientes = new Map<string, Cliente>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Examen>(e => [this.getMascota(e.mascotaId), this.getCliente(e.mascotaId), e.tipo, e.descripcion, e.resultado]);
    this.dataSource.sortingDataAccessor = (e, col) => {
      switch (col) {
        case 'paciente': return this.getMascota(e.mascotaId).toLowerCase();
        case 'examen': return e.tipo.toLowerCase();
        default: return new Date(e.fecha).getTime();
      }
    };
    this.cargar();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    this.hoy = new Date();
    this.mascotas = new Map(this.mascotasService.getAll().map(m => [m.id, m]));
    this.clientes = new Map(this.clientesService.getAll().map(c => [c.id, c]));
    this.todos = this.examenesService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const hace30 = new Date(this.hoy); hace30.setDate(hace30.getDate() - 30);
    const en = (f: FiltroExamenes) => (e: Examen) => f === 'pendientes' ? examenPendiente(e) : f === 'mes' ? new Date(e.fecha) >= hace30 : true;
    this.conteos = { pendientes: this.todos.filter(en('pendientes')).length, mes: this.todos.filter(en('mes')).length, todos: this.todos.length };
    // Sin pendientes, se abre en los últimos 30 días
    if (this.filtro === 'pendientes' && !this.conteos.pendientes) this.filtro = 'mes';
    this.dataSource.data = this.todos.filter(en(this.filtro));
    this.paginator?.firstPage();
  }

  elegirFiltro(f: FiltroExamenes): void { this.filtro = f; this.cargar(); }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }

  getMascota(id: string): string { return this.mascotas.get(id)?.nombre ?? '-'; }
  getCliente(mascotaId: string): string { return this.clientes.get(this.mascotas.get(mascotaId)?.clienteId ?? '')?.nombre ?? '-'; }
  especie(id: string): string { return ICONO_ESPECIE[(this.mascotas.get(id)?.tipo ?? 'Otro') as TipoMascota]; }
  vet(id: string): string {
    const n = this.usuariosService.getNombreCompleto(id).split(' ');
    return n.length > 1 ? `${n[0]} ${n[1].charAt(0)}.` : n[0];
  }
  relativo(fecha: Date | string): string { return tiempoRelativo(fecha, this.hoy); }
  pendiente(e: Examen): boolean { return examenPendiente(e); }

  /** Abre el primer informe adjunto en otra pestaña. */
  async verInforme(e: Examen): Promise<void> {
    const archivo = e.archivos?.[0];
    const contenido = archivo ? await this.archivosService.obtener(archivo.id).catch(() => undefined) : undefined;
    if (!contenido) { this.snack.open('El informe no está guardado en este navegador', 'OK', { duration: 3000 }); return; }
    const url = URL.createObjectURL(contenido);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  editar(e: Examen): void { this.router.navigate(['/examenes/editar', e.id]); }
  verMascota(e: Examen): void { this.router.navigate(['/mascotas', e.mascotaId]); }
}
