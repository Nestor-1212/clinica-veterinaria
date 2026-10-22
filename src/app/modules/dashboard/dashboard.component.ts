import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { CitasService } from '../../core/services/citas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { RolUsuario } from '../../core/models';
import { puedeAcceder } from '../../core/auth/permisos';
import { DatosDashboard } from './dashboard-datos';
import { HoyComponent } from './pestanas/hoy.component';
import { NegocioComponent } from './pestanas/negocio.component';
import { ClientesComponent } from './pestanas/clientes.component';

export type Vista = 'hoy' | 'negocio' | 'clientes';

/** Pestañas por rol y la que abre por defecto: cada rol empieza por su pregunta del día. */
const VISTAS_POR_ROL: Record<RolUsuario, { vistas: Vista[]; inicial: Vista }> = {
  admin: { vistas: ['hoy', 'negocio', 'clientes'], inicial: 'negocio' },
  veterinario: { vistas: ['hoy', 'clientes'], inicial: 'hoy' },
  recepcion: { vistas: ['hoy', 'clientes'], inicial: 'hoy' }
};

export const ETIQUETA_VISTA: Record<Vista, string> = { hoy: 'Hoy', negocio: 'Negocio', clientes: 'Clientes' };

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [DatePipe, MatButton, MatIcon, MatTabGroup, MatTab, MatTabContent, HoyComponent, NegocioComponent, ClientesComponent]
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly etiquetas = ETIQUETA_VISTA;
  readonly datos: DatosDashboard;
  readonly vistas: Vista[];
  readonly indice = signal(0);
  readonly nombre: string;

  readonly puedeCitas = computed(() => puedeAcceder(this.datos.rol, 'citas'));
  readonly puedeClientes = computed(() => puedeAcceder(this.datos.rol, 'clientes'));

  constructor() {
    const usuario = this.auth.currentUser;
    const rol: RolUsuario = usuario?.rol ?? 'recepcion';
    const clientes = inject(ClientesService).getAll();
    const mascotas = inject(MascotasService).getAll();
    const usuarios = inject(UsuariosService).getAll();
    this.datos = {
      hoy: new Date(), rol, usuarioId: usuario?.id ?? '',
      clientes, mascotas, usuarios,
      citas: inject(CitasService).getAll(),
      consultas: inject(ConsultasService).getAll(),
      pagos: inject(PagosService).getAll(),
      vacunas: inject(VacunasService).getAll(),
      cliente: new Map(clientes.map(c => [c.id, c])),
      mascota: new Map(mascotas.map(m => [m.id, m])),
      usuario: new Map(usuarios.map(u => [u.id, u]))
    };
    this.nombre = usuario?.nombre ?? '';

    const config = VISTAS_POR_ROL[rol];
    this.vistas = config.vistas;
    const pedida = this.route.snapshot.queryParamMap.get('vista') as Vista | null;
    this.indice.set(Math.max(0, this.vistas.indexOf(pedida && this.vistas.includes(pedida) ? pedida : config.inicial)));
  }

  /** Recuerda la pestaña en la URL (enlazable y estable al recargar) sin apilar historial. */
  cambiarVista(i: number): void {
    this.indice.set(i);
    this.router.navigate([], { relativeTo: this.route, queryParams: { vista: this.vistas[i] }, replaceUrl: true });
  }

  nuevaCita(): void {
    this.router.navigate(['/citas/nueva']);
  }

  nuevaAtencionInmediata(): void {
    this.router.navigate(['/clientes'], { queryParams: { accion: 'atencion' } });
  }

  nuevoCliente(): void {
    this.router.navigate(['/clientes/nuevo']);
  }
}
