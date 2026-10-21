import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { ConsultasService } from '../../../core/services/consultas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Consulta } from '../../../core/models';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';
import { SlicePipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-consultas',
    templateUrl: './lista-consultas.component.html',
    styleUrls: ['./lista-consultas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, SlicePipe, DatePipe]
})
export class ListaConsultasComponent implements OnInit, AfterViewInit {
  private consultasService = inject(ConsultasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'diagnostico', 'tipo', 'acciones'];
  dataSource = new MatTableDataSource<Consulta>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Consulta>(c => [
      this.getMascota(c.mascotaId), this.getCliente(c.clienteId), this.getVet(c.veterinarioId), c.diagnostico, c.tipo
    ]);
    this.dataSource.data = this.consultasService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }
  iconoTipo(tipo: string): string { return tipo === 'inmediata' ? 'flash_on' : 'event'; }
  verDetalle(c: Consulta): void { this.router.navigate(['/mascotas', c.mascotaId]); }
  nueva(): void { this.router.navigate(['/consultas/nueva']); }
}
