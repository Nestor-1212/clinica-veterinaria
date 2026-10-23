import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { VacunasService } from '../../../core/services/vacunas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cliente, Mascota, TipoMascota, Vacuna } from '../../../core/models';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { EstadoVacuna, FilaVacuna, filasVacunas, mensajeVacuna, textoVencimiento } from '../../../core/utils/vacunas';
import { enlaceWhatsApp } from '../../../core/utils/metricas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatAnchor } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe } from '@angular/common';

type Vista = EstadoVacuna | 'historial';

/** Fila de la tabla: un recordatorio (última dosis) o una dosis del historial. */
interface Fila { vacuna: Vacuna; mascota?: Mascota; cliente?: Cliente; estado?: EstadoVacuna; dias?: number; }

@Component({
    selector: 'app-lista-vacunas',
    templateUrl: './lista-vacunas.component.html',
    styleUrls: ['./lista-vacunas.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe]
})
export class ListaVacunasComponent implements OnInit, AfterViewInit {
  private vacunasService = inject(VacunasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  readonly vistas: { valor: Vista; texto: string }[] = [
    { valor: 'vencida', texto: 'Vencidas' }, { valor: 'proxima', texto: 'Próximos 30 días' },
    { valor: 'al-dia', texto: 'Al día' }, { valor: 'historial', texto: 'Historial de dosis' }
  ];
  vista: Vista = 'vencida';
  conteos: Record<Vista, number> = { vencida: 0, proxima: 0, 'al-dia': 0, historial: 0 };
  displayedColumns = ['paciente', 'vacuna', 'aplicada', 'proxima', 'acciones'];
  dataSource = new MatTableDataSource<Fila>();
  hoy = new Date();

  private recordatorios: FilaVacuna[] = [];
  private historial: Fila[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Fila>(f => [
      f.mascota?.nombre ?? '', f.cliente?.nombre ?? '', f.cliente?.telefono ?? '', f.vacuna.nombre, f.vacuna.lote, f.vacuna.laboratorio
    ]);
    this.dataSource.sortingDataAccessor = (f, col) => {
      switch (col) {
        case 'paciente': return (f.mascota?.nombre ?? '').toLowerCase();
        case 'vacuna': return f.vacuna.nombre.toLowerCase();
        case 'aplicada': return new Date(f.vacuna.fechaAplicacion).getTime();
        default: return new Date(f.vacuna.proximaFecha).getTime();
      }
    };
    this.cargar();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    this.hoy = new Date();
    const mascotas = this.mascotasService.getAll();
    const clientes = this.clientesService.getAll();
    const vacunas = this.vacunasService.getAll();
    this.recordatorios = filasVacunas(vacunas, mascotas, clientes, this.hoy);
    const mascota = new Map(mascotas.map(m => [m.id, m]));
    const cliente = new Map(clientes.map(c => [c.id, c]));
    this.historial = vacunas
      .map(v => ({ vacuna: v, mascota: mascota.get(v.mascotaId), cliente: cliente.get(mascota.get(v.mascotaId)?.clienteId ?? '') }))
      .sort((a, b) => new Date(b.vacuna.fechaAplicacion).getTime() - new Date(a.vacuna.fechaAplicacion).getTime());
    this.conteos = {
      vencida: this.recordatorios.filter(f => f.estado === 'vencida').length,
      proxima: this.recordatorios.filter(f => f.estado === 'proxima').length,
      'al-dia': this.recordatorios.filter(f => f.estado === 'al-dia').length,
      historial: this.historial.length
    };
    // Sin vencidas, se abre en las próximas
    if (this.vista === 'vencida' && !this.conteos.vencida) this.vista = 'proxima';
    this.aplicarVista();
  }

  elegirVista(v: Vista): void { this.vista = v; this.aplicarVista(); }

  private aplicarVista(): void {
    this.displayedColumns = this.vista === 'historial'
      ? ['aplicada', 'paciente', 'vacuna', 'lote', 'veterinario', 'acciones']
      : ['paciente', 'vacuna', 'aplicada', 'proxima', 'acciones'];
    const lista = this.vista === 'historial' ? this.historial : this.recordatorios.filter(f => f.estado === this.vista);
    // Las vencidas, de la más reciente a la más antigua (las recientes son las que más responden)
    this.dataSource.data = this.vista === 'vencida' ? [...lista].reverse() : lista;
    this.paginator?.firstPage();
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }

  especie(f: Fila): string { return ICONO_ESPECIE[(f.mascota?.tipo ?? 'Otro') as TipoMascota]; }
  vencimiento(f: Fila): string { return f.dias === undefined ? '' : textoVencimiento(f.dias); }
  vet(id: string): string {
    const n = this.usuariosService.getNombreCompleto(id).split(' ');
    return n.length > 1 ? `${n[0]} ${n[1].charAt(0)}.` : n[0];
  }
  tel(f: Fila): string { return `tel:+507${(f.cliente?.telefono ?? '').replace(/\D/g, '')}`; }

  whatsapp(f: Fila): string | null {
    if (!f.cliente || !f.mascota || f.estado === undefined || f.dias === undefined) return null;
    return enlaceWhatsApp(f.cliente.telefono, mensajeVacuna(f as FilaVacuna));
  }

  aplicarRefuerzo(f: Fila): void {
    this.router.navigate(['/vacunas/nueva'], { queryParams: { mascotaId: f.vacuna.mascotaId, nombre: f.vacuna.nombre } });
  }
  editar(f: Fila): void { this.router.navigate(['/vacunas/editar', f.vacuna.id]); }
  verMascota(f: Fila): void { this.router.navigate(['/mascotas', f.vacuna.mascotaId]); }
}
