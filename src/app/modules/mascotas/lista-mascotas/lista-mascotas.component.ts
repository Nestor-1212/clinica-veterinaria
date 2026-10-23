import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { CitasService } from '../../../core/services/citas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Mascota, TipoMascota } from '../../../core/models';
import { momentoCita } from '../../../core/utils/metricas';
import { ICONO_ESPECIE, tiempoRelativo } from '../../../core/utils/clientes';
import { FilaMascota, SegmentoMascotas, conteoSegmentosMascotas, enSegmentoMascotas, filasMascotas } from '../../../core/utils/mascotas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatAnchor } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';

interface OpcionSegmento { valor: SegmentoMascotas; texto: string; }

@Component({
    selector: 'app-lista-mascotas',
    templateUrl: './lista-mascotas.component.html',
    styleUrls: ['./lista-mascotas.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatSelect, MatOption, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe, EdadPipe]
})
export class ListaMascotasComponent implements OnInit, AfterViewInit {
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private consultasService = inject(ConsultasService);
  private citasService = inject(CitasService);
  private vacunasService = inject(VacunasService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  /** Atención inmediata y nueva cita solo para quien gestiona Citas. */
  readonly verCitas = puedeAcceder(this.auth.currentUser?.rol, 'citas');
  readonly displayedColumns = ['paciente', 'propietario', 'vacunas', 'ultimaConsulta', 'proximaCita', 'acciones'];
  readonly segmentos: OpcionSegmento[] = [
    { valor: 'todos', texto: 'Todas' },
    { valor: 'vacunas', texto: 'Vacunas vencidas' },
    { valor: 'alergias', texto: 'Con alergias' },
    { valor: 'cita', texto: 'Con cita próxima' }
  ];
  readonly tipos: TipoMascota[] = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];
  especie(tipo: TipoMascota): string { return ICONO_ESPECIE[tipo] ?? ICONO_ESPECIE.Otro; }
  readonly relativo = tiempoRelativo;
  readonly momentoCita = momentoCita;

  dataSource = new MatTableDataSource<FilaMascota>();
  filas: FilaMascota[] = [];
  conteos: Record<SegmentoMascotas, number> = { todos: 0, vacunas: 0, alergias: 0, cita: 0 };
  segmento: SegmentoMascotas = 'todos';
  tipoFiltro: TipoMascota | '' = '';
  hoy = new Date();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<FilaMascota>(f => [
      f.mascota.nombre, f.mascota.tipo, f.mascota.raza, f.mascota.color, f.cliente?.nombre ?? '', f.cliente?.telefono ?? ''
    ]);
    this.dataSource.sortingDataAccessor = (f, col) => {
      switch (col) {
        case 'propietario': return (f.cliente?.nombre ?? '').toLowerCase();
        case 'ultimaConsulta': return f.ultimaConsulta ? new Date(f.ultimaConsulta.fecha).getTime() : 0;
        case 'proximaCita': return f.proximaCita ? momentoCita(f.proximaCita).getTime() : Number.MAX_SAFE_INTEGER;
        default: return f.mascota.nombre.toLowerCase();
      }
    };
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.hoy = new Date();
    const filas = filasMascotas(
      this.mascotasService.getAll(), this.clientesService.getAll(), this.consultasService.getAll(),
      this.citasService.getAll(), this.vacunasService.getAll(), this.hoy
    ).sort((a, b) => a.mascota.nombre.localeCompare(b.mascota.nombre, 'es'));
    this.filas = this.tipoFiltro ? filas.filter(f => f.mascota.tipo === this.tipoFiltro) : filas;
    this.conteos = conteoSegmentosMascotas(this.filas);
    this.aplicarSegmento();
  }

  elegirSegmento(s: SegmentoMascotas): void {
    this.segmento = s;
    this.aplicarSegmento();
    this.paginator?.firstPage();
  }

  elegirTipo(tipo: TipoMascota | ''): void {
    this.tipoFiltro = tipo;
    this.cargar();
    this.paginator?.firstPage();
  }

  private aplicarSegmento(): void {
    this.dataSource.data = this.filas.filter(f => enSegmentoMascotas(f, this.segmento));
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  limpiarBusqueda(input: HTMLInputElement): void {
    input.value = '';
    this.dataSource.filter = '';
    input.focus();
  }

  tel(telefono: string): string { return `tel:+507${telefono.replace(/\D/g, '')}`; }

  verPerfil(m: Mascota): void { this.router.navigate(['/mascotas', m.id]); }
  editar(m: Mascota): void { this.router.navigate(['/mascotas/editar', m.id]); }

  nuevaAtencion(m: Mascota): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: m.clienteId, mascotaId: m.id, tipo: 'inmediata' } });
  }

  nuevaCita(m: Mascota): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: m.clienteId, mascotaId: m.id } });
  }

  eliminar(m: Mascota): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar mascota', message: `¿Eliminar a ${m.nombre}?`, confirmText: 'Eliminar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) {
        this.mascotasService.delete(m.id);
        this.cargar();
        this.snack.open('Mascota eliminada', 'OK', { duration: 2000 });
      }
    });
  }
}
