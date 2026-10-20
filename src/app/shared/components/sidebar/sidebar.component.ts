import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  standalone: false,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['admin', 'veterinario', 'recepcion'] },
    { label: 'Clientes', icon: 'people', route: '/clientes', roles: ['admin', 'veterinario', 'recepcion'] },
    { label: 'Mascotas', icon: 'pets', route: '/mascotas', roles: ['admin', 'veterinario', 'recepcion'] },
    { label: 'Citas', icon: 'event', route: '/citas', roles: ['admin', 'veterinario', 'recepcion'] },
    { label: 'Consultas', icon: 'medical_services', route: '/consultas', roles: ['admin', 'veterinario'] },
    { label: 'Recetas', icon: 'medication', route: '/recetas', roles: ['admin', 'veterinario'] },
    { label: 'Vacunas', icon: 'vaccines', route: '/vacunas', roles: ['admin', 'veterinario', 'recepcion'] },
    { label: 'Laboratorio', icon: 'biotech', route: '/examenes', roles: ['admin', 'veterinario'] },
    { label: 'Pagos', icon: 'payments', route: '/pagos', roles: ['admin', 'recepcion'] },
    { label: 'Reportes', icon: 'bar_chart', route: '/reportes', roles: ['admin'] },
    { label: 'Usuarios', icon: 'manage_accounts', route: '/usuarios', roles: ['admin'] }
  ];

  constructor(public auth: AuthService) {}

  get visibleItems(): NavItem[] {
    const rol = this.auth.currentUser?.rol;
    return this.navItems.filter(item => rol && item.roles.includes(rol));
  }
}
