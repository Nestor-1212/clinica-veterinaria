import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './shared/components/shell/shell.component';

const routes: Routes = [
  { path: 'login', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'clientes', loadChildren: () => import('./modules/clientes/clientes.module').then(m => m.ClientesModule) },
      { path: 'mascotas', loadChildren: () => import('./modules/mascotas/mascotas.module').then(m => m.MascotasModule) },
      { path: 'citas', loadChildren: () => import('./modules/citas/citas.module').then(m => m.CitasModule) },
      { path: 'consultas', loadChildren: () => import('./modules/consultas/consultas.module').then(m => m.ConsultasModule) },
      { path: 'recetas', loadChildren: () => import('./modules/recetas/recetas.module').then(m => m.RecetasModule) },
      { path: 'vacunas', loadChildren: () => import('./modules/vacunas/vacunas.module').then(m => m.VacunasModule) },
      { path: 'examenes', loadChildren: () => import('./modules/examenes/examenes.module').then(m => m.ExamenesModule) },
      { path: 'pagos', loadChildren: () => import('./modules/pagos/pagos.module').then(m => m.PagosModule) },
      {
        path: 'reportes',
        loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/usuarios.module').then(m => m.UsuariosModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
