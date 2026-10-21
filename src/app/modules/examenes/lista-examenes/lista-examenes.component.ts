import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { ExamenesService } from '../../../core/services/examenes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Examen } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';
import { SlicePipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-examenes',
    templateUrl: './lista-examenes.component.html',
    styleUrls: ['./lista-examenes.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, SlicePipe, DatePipe]
})
export class ListaExamenesComponent implements OnInit, AfterViewInit {
  private examenesService = inject(ExamenesService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private router = inject(Router);

  displayedColumns = ['fecha', 'mascota', 'cliente', 'tipo', 'resultado', 'acciones'];
  dataSource = new MatTableDataSource<Examen>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { this.dataSource.data = this.examenesService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getCliente(id: string): string { const m = this.mascotasService.getById(id); return m ? this.clientesService.getById(m.clienteId)?.nombre || '-' : '-'; }
  editar(e: Examen): void { this.router.navigate(['/examenes/editar', e.id]); }
}
