import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './shared/components/shell/shell.component';

export const routes: Routes = [
  { path: 'login', loadChildren: () => import('./modules/auth/auth.routes') },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./modules/dashboard/dashboard.routes') },
      { path: 'clientes', loadChildren: () => import('./modules/clientes/clientes.routes') },
      { path: 'mascotas', loadChildren: () => import('./modules/mascotas/mascotas.routes') },
      { path: 'citas', loadChildren: () => import('./modules/citas/citas.routes') },
      { path: 'consultas', loadChildren: () => import('./modules/consultas/consultas.routes') },
      { path: 'recetas', loadChildren: () => import('./modules/recetas/recetas.routes') },
      { path: 'vacunas', loadChildren: () => import('./modules/vacunas/vacunas.routes') },
      { path: 'examenes', loadChildren: () => import('./modules/examenes/examenes.routes') },
      { path: 'pagos', loadChildren: () => import('./modules/pagos/pagos.routes') },
      {
        path: 'reportes',
        loadChildren: () => import('./modules/reportes/reportes.routes'),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/usuarios.routes'),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

