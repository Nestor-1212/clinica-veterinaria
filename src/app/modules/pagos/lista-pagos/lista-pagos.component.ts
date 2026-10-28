import { ConsultasService } from '../../../core/services/consultas.service';
import { CierreCajaComponent } from '../cierre-caja/cierre-caja.component';
import { aCsv, descargarCsv, fechaArchivo } from '../../../core/utils/csv';
import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PagosService } from '../../../core/services/pagos.service';
import { CobrarService } from '../cobro-dialog/cobrar.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Cliente, Mascota, Pago, Consulta } from '../../../core/models';
import { PorCobrar, ResumenIngresos, diasDesde, enlaceWhatsApp, porCobrar, resumenIngresos } from '../../../core/utils/metricas';
import { FilaMetodo, METODO_ICONO, METODO_TEXTO, atencionesPorCobrar, cobradoHoy, cobradoPorMetodo, conceptoPago, fechaCobro, mensajeCobro } from '../../../core/utils/pagos';
import { tiempoRelativo } from '../../../core/utils/clientes';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { KpiComponent } from '../../../shared/components/kpi/kpi.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { DatePipe } from '@angular/common';

type FiltroPagos = 'pendientes' | 'hoy' | 'mes' | 'todos' | 'anulados';

@Component({
    selector: 'app-lista-pagos',
    templateUrl: './lista-pagos.component.html',
    styleUrls: ['./lista-pagos.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, MatDivider, KpiComponent, DatePipe]
})
export class ListaPagosComponent implements OnInit, AfterViewInit {
  private pagosService = inject(PagosService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private pdfService = inject(PdfService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private consultasService = inject(ConsultasService);
  readonly esRecepcion = this.auth.currentUser?.rol === 'recepcion';
  /** Consultas de hoy sin cobro (cola de recepción). */
  listas: Consulta[] = [];
  private cobrarService = inject(CobrarService);

  readonly METODO_TEXTO = METODO_TEXTO;
  readonly METODO_ICONO = METODO_ICONO;
  readonly filtros: { valor: FiltroPagos; texto: string }[] = [
    { valor: 'pendientes', texto: 'Por cobrar' }, { valor: 'hoy', texto: 'Hoy' }, { valor: 'mes', texto: 'Este mes' },
    { valor: 'todos', texto: 'Todos' }, { valor: 'anulados', texto: 'Anulados' }
  ];
  displayedColumns = ['fecha', 'cliente', 'concepto', 'metodo', 'total', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Pago>();
  filtro: FiltroPagos = 'pendientes';
  conteos: Record<FiltroPagos, number> = { pendientes: 0, hoy: 0, mes: 0, todos: 0, anulados: 0 };
  hoy = new Date();

  /** Cobrado en el mes (por fecha de cobro). */
  totalMes = 0;
  ingresos: ResumenIngresos | null = null;
  cobrar: PorCobrar | null = null;
  hoyCobrado = { total: 0, cantidad: 0 };
  metodos: FilaMetodo[] = [];

  private todos: Pago[] = [];
  private clientes = new Map<string, Cliente>();
  private mascotas = new Map<string, Mascota>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Pago>(p => [
      this.getCliente(p.clienteId), this.getMascota(p.mascotaId), METODO_TEXTO[p.metodoPago], p.estado, p.total.toFixed(2), p.referencia, ...p.items.map(i => i.descripcion)
    ]);
    this.dataSource.sortingDataAccessor = (p, col) => {
      switch (col) {
        case 'total': return p.total;
        case 'cliente': return this.getCliente(p.clienteId).toLowerCase();
        default: return new Date(p.fecha).getTime();
      }
    };
    this.cargar();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    this.hoy = new Date();
    this.clientes = new Map(this.clientesService.getAll().map(c => [c.id, c]));
    this.mascotas = new Map(this.mascotasService.getAll().map(m => [m.id, m]));
    this.todos = this.pagosService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.ingresos = resumenIngresos(this.todos, this.hoy);
    this.totalMes = this.ingresos.mes;
    this.cobrar = porCobrar(this.todos, this.hoy);
    this.hoyCobrado = cobradoHoy(this.todos, this.hoy);
    this.listas = atencionesPorCobrar(this.consultasService.getAll(), this.todos, this.hoy);
    this.metodos = cobradoPorMetodo(this.todos, this.hoy);

    const ini = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
    const esHoy = (p: Pago) => fechaCobro(p).toDateString() === this.hoy.toDateString() || new Date(p.fecha).toDateString() === this.hoy.toDateString();
    const en = (f: FiltroPagos) => (p: Pago): boolean => {
      switch (f) {
        case 'pendientes': return p.estado === 'pendiente';
        case 'hoy': return p.estado !== 'anulado' && esHoy(p);
        case 'mes': return p.estado !== 'anulado' && (new Date(p.fecha) >= ini || fechaCobro(p) >= ini);
        case 'anulados': return p.estado === 'anulado';
        default: return true;
      }
    };
    this.conteos = {
      pendientes: this.todos.filter(en('pendientes')).length, hoy: this.todos.filter(en('hoy')).length,
      mes: this.todos.filter(en('mes')).length, todos: this.todos.length, anulados: this.todos.filter(en('anulados')).length
    };
    // Sin cobros pendientes se abre en el mes; sin pagos en el mes, en todos
    if (this.filtro === 'pendientes' && !this.conteos.pendientes) this.filtro = this.conteos.mes ? 'mes' : 'todos';
    let lista = this.todos.filter(en(this.filtro));
    // Por cobrar: primero los más antiguos (los que más urge gestionar)
    if (this.filtro === 'pendientes') lista = [...lista].reverse();
    this.dataSource.data = lista;
    this.paginator?.firstPage();
  }

  elegirFiltro(f: FiltroPagos): void { this.filtro = f; this.cargar(); }

  /** B3: cobra un pago pendiente con el panel de cobro (método, referencia, cambio y deshacer). */
  marcarPagado(pago: Pago): void {
    this.cobrarService.cobrar(pago, this.getCliente(pago.clienteId), this.getMascota(pago.mascotaId), () => this.cargar())
      .subscribe(ok => { if (ok) this.cargar(); });
  }

  /** B3: anula un pago pendiente o pagado, pidiendo el motivo. */
  anular(pago: Pago): void {
    const data: ConfirmDialogData = {
      title: 'Anular pago',
      message: `¿Anular el pago de $${pago.total.toFixed(2)} de ${this.getCliente(pago.clienteId)}? Esta acción no se puede deshacer.`,
      confirmText: 'Anular pago',
      color: 'warn',
      input: { label: 'Motivo de la anulación', required: true }
    };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(motivo => {
      if (typeof motivo !== 'string' || !motivo.trim()) return;
      if (this.pagosService.anular(pago.id, motivo, this.auth.currentUser?.id)) {
        this.cargar();
        this.avisar(`Pago anulado: ${this.moneda(pago.total)} de ${this.getCliente(pago.clienteId)}`);
      }
    });
  }

  /** Confirmación de cobro o anulación en el centro de la pantalla (no abajo, donde se pierde). */
  private avisar(mensaje: string): void {
    this.snack.open(mensaje, 'OK', { duration: 3500, panelClass: 'snack-centro', verticalPosition: 'top', horizontalPosition: 'center' });
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }

  getCliente(id: string): string { return this.clientes.get(id)?.nombre ?? this.clientesService.getById(id)?.nombre ?? '-'; }
  getMascota(id: string): string { return this.mascotas.get(id)?.nombre ?? this.mascotasService.getById(id)?.nombre ?? '-'; }
  concepto(p: Pago): string { return conceptoPago(p); }
  /** Un pendiente aún no tiene método real: se elige al cobrar. */
  textoMetodo(p: Pago): string { return p.estado === 'pendiente' ? '—' : METODO_TEXTO[p.metodoPago]; }
  iconoMetodo(p: Pago): string { return p.estado === 'pendiente' ? '' : METODO_ICONO[p.metodoPago]; }
  relativo(fecha: Date | string): string { return tiempoRelativo(fecha, this.hoy); }
  diasPendiente(p: Pago): number { return diasDesde(p.fecha, this.hoy); }

  whatsapp(p: Pago): string | null {
    const c = this.clientes.get(p.clienteId);
    return c ? enlaceWhatsApp(c.telefono, mensajeCobro(p, c.nombre, this.getMascota(p.mascotaId))) : null;
  }

  moneda(n: number): string { return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  /** Cifras agregadas (indicadores): en dólares enteros, como en el Dashboard y Reportes. Cada pago lleva centavos. */
  cifra(n: number): string { return '$' + Math.round(n).toLocaleString('es-PA'); }

  /** "1–23 sep": tramo del mes anterior con el que se compara. */
  get contra(): string {
    const ant = new Date(this.hoy.getFullYear(), this.hoy.getMonth() - 1, 1);
    const mes = ant.toLocaleDateString('es-PA', { month: 'short' }).replace('.', '');
    return `vs. 1–${this.hoy.getDate()} ${mes}`;
  }

  get atrasado(): number { return this.cobrar?.tramos.find(t => t.atrasado)?.total ?? 0; }

  abrirCierre(): void {
    this.dialog.open(CierreCajaComponent, { width: '640px', maxWidth: '94vw', autoFocus: 'dialog' });
  }

  /** Exporta lo que se ve en la lista (filtro y búsqueda aplicados), no solo la página actual. */
  exportarCsv(): void {
    const estado: Record<Pago['estado'], string> = { pagado: 'Pagado', pendiente: 'Pendiente', anulado: 'Anulado' };
    const filas = this.dataSource.filteredData.map(p => [
      fechaArchivo(new Date(p.fecha)), p.estado === 'pagado' ? fechaArchivo(fechaCobro(p)) : '', this.getCliente(p.clienteId), this.getMascota(p.mascotaId),
      p.items.map(i => i.descripcion).join(' + '), estado[p.estado], p.estado === 'pendiente' ? '' : METODO_TEXTO[p.metodoPago], p.referencia ?? '',
      p.subtotal, p.descuento, p.total
    ]);
    descargarCsv(`pagos-${this.filtro}-${fechaArchivo(this.hoy)}`, aCsv(
      ['Fecha', 'Fecha de cobro', 'Cliente', 'Mascota', 'Conceptos', 'Estado', 'Método', 'Referencia', 'Subtotal', 'Descuento', 'Total'], filas));
  }

  async imprimirFactura(pago: Pago): Promise<void> {
    const cliente = this.clientesService.getById(pago.clienteId);
    const mascota = this.mascotasService.getById(pago.mascotaId);
    if (cliente && mascota) await this.pdfService.generarFactura(pago, cliente, mascota);
  }
}
