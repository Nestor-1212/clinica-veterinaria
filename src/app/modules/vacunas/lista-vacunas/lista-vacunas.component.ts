import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { VacunasService } from '../../../core/services/vacunas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Vacuna } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-vacunas',
    templateUrl: './lista-vacunas.component.html',
    styleUrls: ['./lista-vacunas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatCheckbox, ReactiveFormsModule, FormsModule, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, DatePipe]
})
export class ListaVacunasComponent implements OnInit, AfterViewInit {
  private vacunasService = inject(VacunasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private router = inject(Router);

  displayedColumns = ['mascota', 'cliente', 'vacuna', 'fechaAplicacion', 'proximaFecha', 'lote', 'acciones'];
  dataSource = new MatTableDataSource<Vacuna>();
  mostrarSoloPendientes = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    const data = this.mostrarSoloPendientes ? this.vacunasService.getPendientes() : this.vacunasService.getAll();
    this.dataSource.data = data.sort((a, b) => new Date(a.proximaFecha).getTime() - new Date(b.proximaFecha).getTime());
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getCliente(id: string): string {
    const m = this.mascotasService.getById(id);
    return m ? this.clientesService.getById(m.clienteId)?.nombre || '-' : '-';
  }

  esPendiente(v: Vacuna): boolean {
    const en7 = new Date();
    en7.setDate(en7.getDate() + 7);
    return new Date(v.proximaFecha) <= en7;
  }

  editar(v: Vacuna): void { this.router.navigate(['/vacunas/editar', v.id]); }
}
