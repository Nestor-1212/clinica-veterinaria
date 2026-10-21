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
import { Receta } from '../../../core/models';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-recetas',
    templateUrl: './lista-recetas.component.html',
    styleUrls: ['./lista-recetas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, DatePipe]
})
export class ListaRecetasComponent implements OnInit, AfterViewInit {
  private recetasService = inject(RecetasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'medicamentos', 'acciones'];
  dataSource = new MatTableDataSource<Receta>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = filtroPorTexto<Receta>(r => [
      this.getMascota(r.mascotaId), this.getCliente(r.clienteId), this.getVet(r.veterinarioId), ...r.items.map(i => i.medicamento)
    ]);
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.dataSource.data = this.recetasService.getAll()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }

  ver(r: Receta): void { this.router.navigate(['/recetas', r.id]); }
  editar(r: Receta): void { this.router.navigate(['/recetas/editar', r.id]); }

  eliminar(r: Receta): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar Receta', message: `¿Eliminar la receta de ${this.getMascota(r.mascotaId)} del ${new Date(r.fecha).toLocaleDateString('es')}?`, confirmText: 'Eliminar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.recetasService.delete(r.id); this.cargar(); this.snack.open('Receta eliminada', 'OK', { duration: 2000 }); }
    });
  }
}
