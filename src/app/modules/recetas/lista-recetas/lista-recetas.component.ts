import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RecetasService } from '../../../core/services/recetas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Receta } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-lista-recetas',
  templateUrl: './lista-recetas.component.html',
  styleUrls: ['./lista-recetas.component.scss']
})
export class ListaRecetasComponent implements OnInit {
  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'medicamentos', 'acciones'];
  dataSource = new MatTableDataSource<Receta>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private recetasService: RecetasService,
    private mascotasService: MascotasService,
    private clientesService: ClientesService,
    private usuariosService: UsuariosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
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
