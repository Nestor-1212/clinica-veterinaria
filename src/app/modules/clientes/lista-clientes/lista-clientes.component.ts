import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { Cliente } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: false,
  selector: 'app-lista-clientes',
  templateUrl: './lista-clientes.component.html',
  styleUrls: ['./lista-clientes.component.scss']
})
export class ListaClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  displayedColumns = ['nombre', 'cedula', 'telefono', 'correo', 'fechaRegistro', 'mascotas', 'acciones'];
  dataSource = new MatTableDataSource<Cliente>();
  loading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.cargarClientes();
    this.route.queryParams.subscribe(params => {
      if (params.accion === 'atencion') {
        this.snack.open('Busque el cliente para iniciar la atención inmediata', 'OK', { duration: 4000 });
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargarClientes(): void {
    this.loading = true;
    const todos = this.clientesService.getAll().filter(c => c.activo);
    this.dataSource.data = todos;
    this.loading = false;
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  getMascotas(clienteId: string): number {
    return this.mascotasService.getByCliente(clienteId).length;
  }

  verDetalle(cliente: Cliente): void {
    this.router.navigate(['/clientes', cliente.id]);
  }

  editar(cliente: Cliente): void {
    this.router.navigate(['/clientes/editar', cliente.id]);
  }

  eliminar(cliente: Cliente): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Cliente',
        message: `¿Desea eliminar a ${cliente.nombre}? Sus datos serán desactivados.`,
        confirmText: 'Eliminar',
        color: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clientesService.delete(cliente.id);
        this.cargarClientes();
        this.snack.open('Cliente eliminado', 'OK', { duration: 2000 });
      }
    });
  }

  nuevaAtencion(cliente: Cliente): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: cliente.id } });
  }
}
