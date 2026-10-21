import { AbstractControl } from '@angular/forms';

/**
 * Valida un formulario antes de enviarlo.
 * Si es inválido marca todos los controles como tocados (para que se vean los
 * mensajes de error) y lleva el foco al primer campo inválido dentro de `raiz`.
 * Devuelve true solo si el formulario es válido y puede guardarse.
 */
export function validarYEnfocar(form: AbstractControl, raiz?: ParentNode | null): boolean {
  if (form.valid) return true;
  form.markAllAsTouched();
  enfocarPrimerInvalido(raiz);
  return false;
}

/** Enfoca el primer control reactivo inválido y habilitado (input, textarea o mat-select). */
export function enfocarPrimerInvalido(raiz?: ParentNode | null): void {
  const contenedor = raiz ?? (typeof document !== 'undefined' ? document : null);
  const el = contenedor?.querySelector<HTMLElement>(
    '[formcontrolname].ng-invalid:not([disabled]):not(.mat-mdc-select-disabled)'
  );
  el?.focus();
}

/** Habilita o deshabilita un control sin emitir valueChanges (evita bucles). */
export function habilitarSi(control: AbstractControl | null, habilitado: boolean): void {
  if (!control) return;
  if (habilitado && control.disabled) control.enable({ emitEvent: false });
  if (!habilitado && control.enabled) control.disable({ emitEvent: false });
}
