import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { RolUsuario, Usuario } from '../../../core/models';
import { ROL_LABELS } from '../../../core/auth/permisos';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';

@Component({
    selector: 'app-lista-usuarios',
    templateUrl: './lista-usuarios.component.html',
    styleUrls: ['./lista-usuarios.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator]
})
export class ListaUsuariosComponent implements OnInit, AfterViewInit {
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private auth = inject(AuthService);

  displayedColumns = ['nombre', 'correo', 'rol', 'especialidad', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<Usuario>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    // B9: nunca filtrar por la contraseña.
    this.dataSource.filterPredicate = filtroPorTexto<Usuario>(u => [u.nombre, u.apellido, u.correo, this.getRolLabel(u.rol), u.especialidad, u.telefono]);
    this.cargar();
  }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  cargar(): void { this.dataSource.data = this.usuariosService.getAll(); }
  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  editar(u: Usuario): void { this.router.navigate(['/usuarios/editar', u.id]); }

  getRolLabel(rol: string): string {
    return ROL_LABELS[rol as RolUsuario] || rol;
  }

  iconoRol(rol: string): string {
    const iconos: Record<string, string> = { admin: 'admin_panel_settings', veterinario: 'medical_services', recepcion: 'support_agent' };
    return iconos[rol] || 'person';
  }

  eliminar(u: Usuario): void {
    // B4: no permitir desactivarse a sí mismo ni dejar la clínica sin administradores.
    const error = this.usuariosService.validarCambio(u.id, { activo: false }, this.auth.currentUser?.id);
    if (error) {
      this.snack.open(error, 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Desactivar Usuario', message: `¿Desactivar a ${u.nombre} ${u.apellido}?`, confirmText: 'Desactivar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.usuariosService.delete(u.id); this.cargar(); this.snack.open('Usuario desactivado', 'OK', { duration: 2000 }); }
    });
  }
}
