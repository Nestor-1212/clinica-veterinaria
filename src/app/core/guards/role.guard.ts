import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Permite el acceso solo a los roles listados en `data.roles` (ver core/auth/permisos.ts). */
export const roleGuard: CanActivateFn = route => {
  const roles: string[] = route.data['roles'] || [];
  if (inject(AuthService).hasRole(roles)) return true;
  const router = inject(Router);
  // Evita un bucle si el rol tampoco tiene acceso al dashboard.
  return route.routeConfig?.path === 'dashboard' ? router.createUrlTree(['/login']) : router.createUrlTree(['/dashboard']);
};
