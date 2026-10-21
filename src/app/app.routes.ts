import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { rolesDe } from './core/auth/permisos';
import { ShellComponent } from './shared/components/shell/shell.component';

export const routes: Routes = [
  { path: 'login', loadChildren: () => import('./modules/auth/auth.routes') },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('dashboard') }
      },
      {
        path: 'clientes',
        loadChildren: () => import('./modules/clientes/clientes.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('clientes') }
      },
      {
        path: 'mascotas',
        loadChildren: () => import('./modules/mascotas/mascotas.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('mascotas') }
      },
      {
        path: 'citas',
        loadChildren: () => import('./modules/citas/citas.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('citas') }
      },
      {
        path: 'consultas',
        loadChildren: () => import('./modules/consultas/consultas.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('consultas') }
      },
      {
        path: 'recetas',
        loadChildren: () => import('./modules/recetas/recetas.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('recetas') }
      },
      {
        path: 'vacunas',
        loadChildren: () => import('./modules/vacunas/vacunas.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('vacunas') }
      },
      {
        path: 'examenes',
        loadChildren: () => import('./modules/examenes/examenes.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('examenes') }
      },
      {
        path: 'pagos',
        loadChildren: () => import('./modules/pagos/pagos.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('pagos') }
      },
      {
        path: 'reportes',
        loadChildren: () => import('./modules/reportes/reportes.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('reportes') }
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/usuarios.routes'),
        canActivate: [roleGuard],
        data: { roles: rolesDe('usuarios') }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
