import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = route => {
  const roles: string[] = route.data['roles'] || [];
  return inject(AuthService).hasRole(roles) || inject(Router).createUrlTree(['/dashboard']);
};
