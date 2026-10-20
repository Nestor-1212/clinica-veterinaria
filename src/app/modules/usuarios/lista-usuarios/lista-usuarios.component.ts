import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Usuario } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: false,
  selector: 'app-lista-usuarios',
  templateUrl: './lista-usuarios.component.html',
  styleUrls: ['./lista-usuarios.component.scss']
})
export class ListaUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  displayedColumns = ['nombre', 'correo', 'rol', 'especialidad', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<Usuario>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  cargar(): void { this.dataSource.data = this.usuariosService.getAll(); }
  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  editar(u: Usuario): void { this.router.navigate(['/usuarios/editar', u.id]); }

  getRolLabel(rol: string): string {
    const labels: any = { admin: 'Administrador', veterinario: 'Veterinario', recepcion: 'Recepción' };
    return labels[rol] || rol;
  }

  iconoRol(rol: string): string {
    const iconos: Record<string, string> = { admin: 'admin_panel_settings', veterinario: 'medical_services', recepcion: 'support_agent' };
    return iconos[rol] || 'person';
  }

  eliminar(u: Usuario): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Desactivar Usuario', message: `¿Desactivar a ${u.nombre} ${u.apellido}?`, confirmText: 'Desactivar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.usuariosService.delete(u.id); this.cargar(); this.snack.open('Usuario desactivado', 'OK', { duration: 2000 }); }
    });
  }
}
