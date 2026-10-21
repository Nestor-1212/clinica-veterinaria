import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cita, EstadoCita } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSelect, MatOption } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatChip } from '@angular/material/chips';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { SlicePipe, TitleCasePipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-citas',
    templateUrl: './lista-citas.component.html',
    styleUrls: ['./lista-citas.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatSelect, ReactiveFormsModule, FormsModule, MatOption, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatMenuTrigger, MatMenu, MatMenuItem, MatDivider, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, SlicePipe, TitleCasePipe, DatePipe]
})
export class ListaCitasComponent implements OnInit, AfterViewInit {
  private citasService = inject(CitasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'motivo', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Cita>();
  filtroEstado = '';
  estadosFiltro: EstadoCita[] = ['pendiente', 'confirmada', 'completada', 'cancelada', 'inmediata'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

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

  iconoEstado(estado: string): string {
    const iconos: Record<string, string> = {
      pendiente: 'schedule',
      confirmada: 'check_circle',
      completada: 'done_all',
      cancelada: 'cancel',
      inmediata: 'flash_on'
    };
    return iconos[estado] || 'event';
  }

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

  /**
   * B6: cancelar una cita cambia su estado a 'cancelada' (antes la borraba físicamente y
   * dejaba consultas con citaId huérfano). El historial se conserva.
   */
  cancelar(cita: Cita): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancelar Cita', message: '¿Cancelar esta cita? Quedará en el historial como cancelada.', confirmText: 'Sí, cancelar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.cambiarEstado(cita, 'cancelada'); }
    });
  }
}
