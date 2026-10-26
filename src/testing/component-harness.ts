import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';
import { DEMO_MODE } from '../app/core/config/demo-mode.token';

export interface Harness<T> {
  componente: T;
  navigate: ReturnType<typeof vi.fn>;
  snack: { open: ReturnType<typeof vi.fn> };
  dialogResult: (valor: unknown) => void;
}

/**
 * Crea un componente SIN renderizar su plantilla (solo su lógica), con ruta, snackbar y diálogo simulados.
 * El diálogo devuelve en afterClosed() el valor configurado con dialogResult().
 */
export function crearComponente<T>(
  tipo: Type<T>,
  opciones: { params?: Record<string, string>; queryParams?: Record<string, string> } = {}
): Harness<T> {
  let resultadoDialogo: unknown = true;
  // Como MatSnackBar real: open() devuelve una referencia con onAction() (p. ej. "Deshacer")
  const snack = { open: vi.fn(() => ({ onAction: () => EMPTY })) };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(resultadoDialogo) })) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: DEMO_MODE, useValue: false },
      { provide: ActivatedRoute, useValue: { snapshot: { params: opciones.params ?? {}, queryParams: opciones.queryParams ?? {} }, queryParams: of(opciones.queryParams ?? {}) } },
      { provide: MatSnackBar, useValue: snack },
      { provide: MatDialog, useValue: dialog }
    ]
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true) as unknown as ReturnType<typeof vi.fn>;
  const componente = TestBed.runInInjectionContext(() => new tipo());
  return { componente, navigate, snack, dialogResult: v => { resultadoDialogo = v; } };
}

/** Inicia sesión directamente en sessionStorage (formato { id }). */
export function sesionComo(id: string): void {
  sessionStorage.setItem('vet_session', JSON.stringify({ id }));
}
