import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { RecetasService } from '../../../core/services/recetas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Cliente, Consulta, Mascota, Receta, TipoMascota } from '../../../core/models';
import { ICONO_ESPECIE, tiempoRelativo } from '../../../core/utils/clientes';
import { EstadoTratamiento, estadoTratamiento, textoReceta } from '../../../core/utils/recetas';
import { enlaceWhatsApp } from '../../../core/utils/metricas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton, MatAnchor } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { DatePipe } from '@angular/common';

type FiltroRecetas = 'curso' | 'mes' | 'todas';

@Component({
    selector: 'app-lista-recetas',
    templateUrl: './lista-recetas.component.html',
    styleUrls: ['./lista-recetas.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, MatDivider, DatePipe]
})
export class ListaRecetasComponent implements OnInit, AfterViewInit {
  private recetasService = inject(RecetasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private consultasService = inject(ConsultasService);
  private pdfService = inject(PdfService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  readonly filtros: { valor: FiltroRecetas; texto: string }[] = [
    { valor: 'curso', texto: 'Tratamiento en curso' }, { valor: 'mes', texto: 'Últimos 30 días' }, { valor: 'todas', texto: 'Todas' }
  ];
  displayedColumns = ['fecha', 'paciente', 'medicamentos', 'tratamiento', 'veterinario', 'acciones'];
  dataSource = new MatTableDataSource<Receta>();
  filtro: FiltroRecetas = 'curso';
  conteos: Record<FiltroRecetas, number> = { curso: 0, mes: 0, todas: 0 };
  hoy = new Date();

  private todas: Receta[] = [];
  private estados = new Map<string, EstadoTratamiento>();
  private mascotas = new Map<string, Mascota>();
  private clientes = new Map<string, Cliente>();
  private consultas = new Map<string, Consulta>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Receta>(r => [
      this.getMascota(r.mascotaId), this.getCliente(r.clienteId), this.getVet(r.veterinarioId), this.diagnostico(r), ...r.items.map(i => i.medicamento)
    ]);
    this.dataSource.sortingDataAccessor = (r, col) => {
      switch (col) {
        case 'paciente': return this.getMascota(r.mascotaId).toLowerCase();
        case 'tratamiento': return this.estado(r).diasRestantes ?? Number.MAX_SAFE_INTEGER;
        default: return new Date(r.fecha).getTime();
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
    this.mascotas = new Map(this.mascotasService.getAll().map(m => [m.id, m]));
    this.clientes = new Map(this.clientesService.getAll().map(c => [c.id, c]));
    this.consultas = new Map(this.consultasService.getAll().map(c => [c.id, c]));
    this.todas = this.recetasService.getAll()
      .filter(r => new Date(r.fecha) <= this.hoy)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.estados = new Map(this.todas.map(r => [r.id, estadoTratamiento(r, this.hoy)]));
    const hace30 = new Date(this.hoy); hace30.setDate(hace30.getDate() - 30);
    const en = (f: FiltroRecetas) => (r: Receta) => f === 'curso' ? this.estado(r).enCurso : f === 'mes' ? new Date(r.fecha) >= hace30 : true;
    this.conteos = { curso: this.todas.filter(en('curso')).length, mes: this.todas.filter(en('mes')).length, todas: this.todas.length };
    // Sin tratamientos en curso, se abre en los últimos 30 días
    if (this.filtro === 'curso' && !this.conteos.curso) this.filtro = 'mes';
    this.dataSource.data = this.todas.filter(en(this.filtro));
    this.paginator?.firstPage();
  }

  elegirFiltro(f: FiltroRecetas): void { this.filtro = f; this.cargar(); }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }

  // ---------- Datos ----------
  getMascota(id: string): string { return this.mascotas.get(id)?.nombre ?? '-'; }
  getCliente(id: string): string { return this.clientes.get(id)?.nombre ?? '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }
  vetCorto(id: string): string {
    const n = this.getVet(id).split(' ');
    return n.length > 1 ? `${n[0]} ${n[1].charAt(0)}.` : n[0];
  }
  especie(id: string): string { return ICONO_ESPECIE[(this.mascotas.get(id)?.tipo ?? 'Otro') as TipoMascota]; }
  diagnostico(r: Receta): string { return this.consultas.get(r.consultaId)?.diagnostico ?? ''; }
  estado(r: Receta): EstadoTratamiento { return this.estados.get(r.id) ?? { enCurso: false, diasRestantes: null, fin: null }; }
  relativo(fecha: Date | string): string { return tiempoRelativo(fecha, this.hoy); }

  textoEstado(r: Receta): string {
    const e = this.estado(r);
    if (!e.fin) return 'Sin fecha de fin';
    if (!e.enCurso) return 'Terminado';
    return e.diasRestantes === 0 ? 'Termina hoy' : e.diasRestantes === 1 ? 'Termina mañana' : `Termina en ${e.diasRestantes} días`;
  }

  whatsapp(r: Receta): string | null {
    const c = this.clientes.get(r.clienteId);
    return c ? enlaceWhatsApp(c.telefono, textoReceta(r, this.mascotas.get(r.mascotaId), c.nombre)) : null;
  }

  // ---------- Acciones ----------
  ver(r: Receta): void { this.router.navigate(['/recetas', r.id]); }
  editar(r: Receta): void { this.router.navigate(['/recetas/editar', r.id]); }

  async pdf(r: Receta): Promise<void> {
    const mascota = this.mascotas.get(r.mascotaId);
    const cliente = this.clientes.get(r.clienteId);
    const vet = this.usuariosService.getById(r.veterinarioId);
    if (mascota && cliente && vet) await this.pdfService.generarReceta(r, mascota, cliente, vet);
  }

  eliminar(r: Receta): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar receta', message: `¿Eliminar la receta de ${this.getMascota(r.mascotaId)} del ${new Date(r.fecha).toLocaleDateString('es-PA')}?`, confirmText: 'Eliminar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.recetasService.delete(r.id); this.cargar(); this.snack.open('Receta eliminada', 'OK', { duration: 2000 }); }
    });
  }
}
