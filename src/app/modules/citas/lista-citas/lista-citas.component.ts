import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cita, EstadoCita } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-lista-citas',
  templateUrl: './lista-citas.component.html',
  styleUrls: ['./lista-citas.component.scss']
})
export class ListaCitasComponent implements OnInit {
  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'motivo', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Cita>();
  filtroEstado = '';
  estadosFiltro: EstadoCita[] = ['pendiente', 'confirmada', 'completada', 'cancelada', 'inmediata'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private citasService: CitasService,
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private usuariosService: UsuariosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

  cargar(): void {
    let citas = this.citasService.getAll();
    if (this.filtroEstado) citas = citas.filter(c => c.estado === this.filtroEstado);
    this.dataSource.data = citas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }

  cambiarEstado(cita: Cita, estado: EstadoCita): void {
    this.citasService.update(cita.id, { estado });
    this.cargar();
    this.snack.open(`Estado actualizado a ${estado}`, 'OK', { duration: 2000 });
  }

  iniciarConsulta(cita: Cita): void {
    this.router.navigate(['/consultas/nueva'], {
      queryParams: { citaId: cita.id, mascotaId: cita.mascotaId, clienteId: cita.clienteId }
    });
  }

  eliminar(cita: Cita): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancelar Cita', message: '¿Cancelar esta cita?', confirmText: 'Sí, cancelar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.citasService.delete(cita.id); this.cargar(); this.snack.open('Cita cancelada', 'OK', { duration: 2000 }); }
    });
  }
}
