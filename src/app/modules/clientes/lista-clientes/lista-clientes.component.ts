import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { CitasService } from '../../../core/services/citas.service';
import { PagosService } from '../../../core/services/pagos.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Cliente, TipoMascota } from '../../../core/models';
import { enlaceWhatsApp, momentoCita } from '../../../core/utils/metricas';
import { FilaCliente, ICONO_ESPECIE, SegmentoClientes, conteoSegmentos, enSegmento, filasClientes, tiempoRelativo } from '../../../core/utils/clientes';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatAnchor } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe, DecimalPipe } from '@angular/common';

interface OpcionSegmento { valor: SegmentoClientes; texto: string; }

@Component({
    selector: 'app-lista-clientes',
    templateUrl: './lista-clientes.component.html',
    styleUrls: ['./lista-clientes.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe, DecimalPipe]
})
export class ListaClientesComponent implements OnInit, AfterViewInit {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private citasService = inject(CitasService);
  private pagosService = inject(PagosService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Saldos solo para quien cobra (admin y recepción), igual que en el dashboard. */
  readonly verSaldo = puedeAcceder(this.auth.currentUser?.rol, 'pagos');
  readonly displayedColumns = ['cliente', 'contacto', 'mascotas', 'ultimaVisita', 'proximaCita', ...(this.verSaldo ? ['saldo'] : []), 'acciones'];
  readonly segmentos: OpcionSegmento[] = [
    { valor: 'todos', texto: 'Todos' },
    ...(this.verSaldo ? [{ valor: 'saldo' as const, texto: 'Con saldo' }] : []),
    { valor: 'recuperar', texto: 'Para recuperar' },
    { valor: 'nuevos', texto: 'Nuevos este mes' }
  ];
  readonly relativo = tiempoRelativo;
  readonly momentoCita = momentoCita;

  dataSource = new MatTableDataSource<FilaCliente>();
  filas: FilaCliente[] = [];
  conteos: Record<SegmentoClientes, number> = { todos: 0, saldo: 0, recuperar: 0, nuevos: 0 };
  segmento: SegmentoClientes = 'todos';
  hoy = new Date();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<FilaCliente>(f => [
      f.cliente.nombre, f.cliente.cedula, f.cliente.telefono, f.cliente.correo, f.cliente.direccion, ...f.mascotas.map(m => m.nombre)
    ]);
    this.dataSource.sortingDataAccessor = (f, col) => {
      switch (col) {
        case 'ultimaVisita': return f.ultimaVisita?.getTime() ?? 0;
        case 'proximaCita': return f.proximaCita ? momentoCita(f.proximaCita).getTime() : Number.MAX_SAFE_INTEGER;
        case 'saldo': return f.saldo;
        default: return f.cliente.nombre.toLowerCase();
      }
    };
    this.cargarClientes();
    this.route.queryParams.subscribe(params => {
      if (params.accion === 'atencion') {
        this.snack.open('Busque el cliente para iniciar la atención inmediata', 'OK', { duration: 4000 });
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargarClientes(): void {
    this.hoy = new Date();
    this.filas = filasClientes(
      this.clientesService.getAll(), this.mascotasService.getAll(), this.consultasService.getAll(),
      this.citasService.getAll(), this.pagosService.getAll(), this.hoy
    ).sort((a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre, 'es'));
    this.conteos = conteoSegmentos(this.filas);
    this.aplicarSegmento();
  }

  elegirSegmento(s: SegmentoClientes): void {
    this.segmento = s;
    this.aplicarSegmento();
    this.paginator?.firstPage();
  }

  private aplicarSegmento(): void {
    this.dataSource.data = this.filas.filter(f => enSegmento(f, this.segmento));
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  limpiarBusqueda(input: HTMLInputElement): void {
    input.value = '';
    this.dataSource.filter = '';
    input.focus();
  }

  especie(tipo: TipoMascota): string { return ICONO_ESPECIE[tipo] ?? ICONO_ESPECIE.Otro; }

  tel(telefono: string): string { return `tel:+507${telefono.replace(/\D/g, '')}`; }

  whatsapp(c: Cliente): string | null {
    return enlaceWhatsApp(c.telefono, `Hola ${c.nombre}, le escribimos de la clínica veterinaria.`);
  }

  verDetalle(cliente: Cliente): void {
    this.router.navigate(['/clientes', cliente.id]);
  }

  editar(cliente: Cliente): void {
    this.router.navigate(['/clientes/editar', cliente.id]);
  }

  nuevaCita(cliente: Cliente): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: cliente.id } });
  }

  eliminar(cliente: Cliente): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Desactivar cliente',
        message: `¿Desactivar a ${cliente.nombre}? Deja de aparecer en las listas, pero su historial, mascotas y pagos se conservan.`,
        confirmText: 'Desactivar',
        color: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clientesService.delete(cliente.id);
        this.cargarClientes();
        this.snack.open('Cliente desactivado', 'OK', { duration: 2000 });
      }
    });
  }

  /** Igual que en el expediente: abre la cita en modo atención inmediata (antes abría una cita normal). */
  nuevaAtencion(cliente: Cliente): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: cliente.id, tipo: 'inmediata' } });
  }
}
