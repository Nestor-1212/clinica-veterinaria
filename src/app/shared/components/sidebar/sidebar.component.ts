import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { RouterLinkActive, RouterLink } from '@angular/router';
import { Seccion, puedeAcceder } from '../../../core/auth/permisos';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  seccion: Seccion;
}

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    imports: [MatIcon, MatDivider, RouterLinkActive, RouterLink]
})
export class SidebarComponent {
  auth = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', seccion: 'dashboard' },
    { label: 'Clientes', icon: 'people', route: '/clientes', seccion: 'clientes' },
    { label: 'Mascotas', icon: 'pets', route: '/mascotas', seccion: 'mascotas' },
    { label: 'Citas', icon: 'event', route: '/citas', seccion: 'citas' },
    { label: 'Consultas', icon: 'medical_services', route: '/consultas', seccion: 'consultas' },
    { label: 'Recetas', icon: 'medication', route: '/recetas', seccion: 'recetas' },
    { label: 'Vacunas', icon: 'vaccines', route: '/vacunas', seccion: 'vacunas' },
    { label: 'Laboratorio', icon: 'biotech', route: '/examenes', seccion: 'examenes' },
    { label: 'Pagos', icon: 'payments', route: '/pagos', seccion: 'pagos' },
    { label: 'Reportes', icon: 'bar_chart', route: '/reportes', seccion: 'reportes' },
    { label: 'Usuarios', icon: 'manage_accounts', route: '/usuarios', seccion: 'usuarios' }
  ];

  get visibleItems(): NavItem[] {
    const rol = this.auth.currentUser?.rol;
    return this.navItems.filter(item => puedeAcceder(rol, item.seccion));
  }
}
