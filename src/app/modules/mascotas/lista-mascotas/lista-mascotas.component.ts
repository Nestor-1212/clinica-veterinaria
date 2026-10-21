import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Mascota } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSelect, MatOption } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatChip } from '@angular/material/chips';

@Component({
    selector: 'app-lista-mascotas',
    templateUrl: './lista-mascotas.component.html',
    styleUrls: ['./lista-mascotas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatSelect, ReactiveFormsModule, FormsModule, MatOption, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator]
})
export class ListaMascotasComponent implements OnInit, AfterViewInit {
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  displayedColumns = ['nombre', 'tipo', 'raza', 'cliente', 'peso', 'edad', 'acciones'];
  dataSource = new MatTableDataSource<Mascota>();
  tipoFiltro = '';
  tipos = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    let mascotas = this.mascotasService.getAll().filter(m => m.activo);
    if (this.tipoFiltro) mascotas = mascotas.filter(m => m.tipo === this.tipoFiltro);
    this.dataSource.data = mascotas;
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  getClienteNombre(clienteId: string): string {
    return this.clientesService.getById(clienteId)?.nombre || 'Desconocido';
  }

  verPerfil(m: Mascota): void { this.router.navigate(['/mascotas', m.id]); }
  editar(m: Mascota): void { this.router.navigate(['/mascotas/editar', m.id]); }

  eliminar(m: Mascota): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar Mascota', message: `¿Eliminar a ${m.nombre}?`, confirmText: 'Eliminar', color: 'warn' }
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
