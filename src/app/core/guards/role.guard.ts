import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

const SECCIONES: Record<string, string> = {
  pagos: 'Pagos', reportes: 'Reportes', usuarios: 'Usuarios', consultas: 'Consultas', recetas: 'Recetas',
  vacunas: 'Vacunas', examenes: 'Laboratorio', citas: 'Citas', clientes: 'Clientes', mascotas: 'Mascotas'
};

/** Permite el acceso solo a los roles listados en `data.roles` (ver core/auth/permisos.ts). */
export const roleGuard: CanActivateFn = route => {
  const roles: string[] = route.data['roles'] || [];
  if (inject(AuthService).hasRole(roles)) return true;
  const router = inject(Router);
  // Sin aviso, el redirigido no sabe por qué no llegó a donde quería ir
  const seccion = SECCIONES[route.routeConfig?.path ?? ''] ?? 'esa sección';
  inject(MatSnackBar, { optional: true })?.open(`Su usuario no tiene acceso a ${seccion}.`, 'OK', { duration: 4000 });
  // Evita un bucle si el rol tampoco tiene acceso al dashboard.
  return route.routeConfig?.path === 'dashboard' ? router.createUrlTree(['/login']) : router.createUrlTree(['/dashboard']);
};
