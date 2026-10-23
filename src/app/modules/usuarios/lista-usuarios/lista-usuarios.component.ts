import { Component, OnInit, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { CitasService } from '../../../core/services/citas.service';
import { AuthService } from '../../../core/services/auth.service';
import { RolUsuario, Usuario } from '../../../core/models';
import { ROL_LABELS } from '../../../core/auth/permisos';
import { mismoDia } from '../../../core/utils/metricas';
import { filtroPorTexto } from '../../../shared/utils/filtro-texto';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatAnchor } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatePipe } from '@angular/common';

type FiltroUsuarios = 'todos' | RolUsuario | 'inactivos';

export const ICONO_ROL: Record<RolUsuario, string> = { admin: 'admin_panel_settings', veterinario: 'medical_services', recepcion: 'support_agent' };

@Component({
    selector: 'app-lista-usuarios',
    templateUrl: './lista-usuarios.component.html',
    styleUrls: ['./lista-usuarios.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe]
})
export class ListaUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private consultasService = inject(ConsultasService);
  private citasService = inject(CitasService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly yo = this.auth.currentUser?.id;
  readonly ICONO_ROL = ICONO_ROL;
  readonly filtros: { valor: FiltroUsuarios; texto: string }[] = [
    { valor: 'todos', texto: 'Activos' }, { valor: 'veterinario', texto: 'Veterinarios' }, { valor: 'recepcion', texto: 'Recepción' },
    { valor: 'admin', texto: 'Administradores' }, { valor: 'inactivos', texto: 'Inactivos' }
  ];
  filtro: FiltroUsuarios = 'todos';
  conteos: Record<FiltroUsuarios, number> = { todos: 0, veterinario: 0, recepcion: 0, admin: 0, inactivos: 0 };
  /** Contenedor de datos con búsqueda (sin tabla: se pinta como tarjetas). */
  dataSource = new MatTableDataSource<Usuario>();
  /** Actividad de cada veterinario: consultas del mes y citas de hoy. */
  actividad: Record<string, { consultasMes: number; citasHoy: number }> = {};

  private todos: Usuario[] = [];

  ngOnInit(): void {
    // B9: nunca filtrar por la contraseña.
    this.dataSource.filterPredicate = filtroPorTexto<Usuario>(u => [u.nombre, u.apellido, u.correo, this.getRolLabel(u.rol), u.especialidad, u.telefono]);
    this.cargar();
  }

  cargar(): void {
    this.todos = this.usuariosService.getAll().sort((a, b) =>
      Number(b.activo) - Number(a.activo) || ['admin', 'veterinario', 'recepcion'].indexOf(a.rol) - ['admin', 'veterinario', 'recepcion'].indexOf(b.rol) || a.nombre.localeCompare(b.nombre, 'es'));
    const hoy = new Date();
    const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const consultas = this.consultasService.getAll().filter(c => new Date(c.fecha) >= ini && new Date(c.fecha) <= hoy);
    const citasHoy = this.citasService.getAll().filter(c => mismoDia(c.fecha, hoy) && c.estado !== 'cancelada');
    this.actividad = Object.fromEntries(this.todos.filter(u => u.rol === 'veterinario').map(u => [u.id, {
      consultasMes: consultas.filter(c => c.veterinarioId === u.id).length,
      citasHoy: citasHoy.filter(c => c.veterinarioId === u.id).length
    }]));
    const activos = this.todos.filter(u => u.activo);
    this.conteos = {
      todos: activos.length,
      veterinario: activos.filter(u => u.rol === 'veterinario').length,
      recepcion: activos.filter(u => u.rol === 'recepcion').length,
      admin: activos.filter(u => u.rol === 'admin').length,
      inactivos: this.todos.length - activos.length
    };
    this.aplicarFiltro();
  }

  elegirFiltro(f: FiltroUsuarios): void { this.filtro = f; this.aplicarFiltro(); }

  private aplicarFiltro(): void {
    const f = this.filtro;
    // "Todos" del filtro de búsqueda incluye inactivos para no esconder resultados al buscar
    this.dataSource.data = f === 'inactivos' ? this.todos.filter(u => !u.activo)
      : f === 'todos' ? this.todos
        : this.todos.filter(u => u.activo && u.rol === f);
  }

  /** Tarjetas visibles: en "Activos" sin búsqueda se ocultan los inactivos (tienen su filtro). */
  get visibles(): Usuario[] {
    const lista = this.dataSource.filteredData;
    return this.filtro === 'todos' && !this.dataSource.filter ? lista.filter(u => u.activo) : lista;
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  limpiarBusqueda(input: HTMLInputElement): void { input.value = ''; this.dataSource.filter = ''; input.focus(); }
  editar(u: Usuario): void { this.router.navigate(['/usuarios/editar', u.id]); }

  getRolLabel(rol: string): string {
    return ROL_LABELS[rol as RolUsuario] || rol;
  }

  iconoRol(rol: string): string { return ICONO_ROL[rol as RolUsuario] ?? 'person'; }

  iniciales(u: Usuario): string { return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase(); }

  tel(u: Usuario): string { return `tel:+507${(u.telefono ?? '').replace(/\D/g, '')}`; }

  eliminar(u: Usuario): void {
    // B4: no permitir desactivarse a sí mismo ni dejar la clínica sin administradores.
    const error = this.usuariosService.validarCambio(u.id, { activo: false }, this.auth.currentUser?.id);
    if (error) {
      this.snack.open(error, 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Desactivar usuario', message: `¿Desactivar a ${u.nombre} ${u.apellido}? No podrá iniciar sesión; su historial se conserva y puede reactivarse.`, confirmText: 'Desactivar', color: 'warn' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) { this.usuariosService.delete(u.id); this.cargar(); this.snack.open('Usuario desactivado', 'OK', { duration: 2000 }); }
    });
  }

  reactivar(u: Usuario): void {
    this.usuariosService.update(u.id, { activo: true });
    this.cargar();
    this.snack.open(`${u.nombre} puede volver a iniciar sesión`, 'OK', { duration: 2500 });
  }
}
