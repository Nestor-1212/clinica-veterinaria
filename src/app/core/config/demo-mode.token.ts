import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Indica si la app corre en modo demo (semilla de datos + acceso rápido en el login). */
export const DEMO_MODE = new InjectionToken<boolean>('DEMO_MODE', {
  providedIn: 'root',
  factory: () => environment.demo
});
