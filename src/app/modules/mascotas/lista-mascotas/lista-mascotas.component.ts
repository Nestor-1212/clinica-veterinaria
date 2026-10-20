import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Mascota } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: false,
  selector: 'app-lista-mascotas',
  templateUrl: './lista-mascotas.component.html',
  styleUrls: ['./lista-mascotas.component.scss']
})
export class ListaMascotasComponent implements OnInit {
  displayedColumns = ['nombre', 'tipo', 'raza', 'cliente', 'peso', 'edad', 'acciones'];
  dataSource = new MatTableDataSource<Mascota>();
  tipoFiltro = '';
  tipos = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private mascotasService: MascotasService,
    private clientesService: ClientesService,
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
