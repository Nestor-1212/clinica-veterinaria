import { Injectable } from '@angular/core';

/**
 * Marca la próxima navegación como la "entrada" desde el login para que solo esa
 * use la View Transition (la franja de marca se convierte en la barra superior).
 * El resto de navegaciones de la app no se animan.
 */
@Injectable({ providedIn: 'root' })
export class TransicionEntradaService {
  private pendiente = false;

  marcar(): void {
    this.pendiente = true;
  }

  /** Devuelve si la navegación en curso es la entrada y consume la marca. */
  consumir(): boolean {
    const activa = this.pendiente;
    this.pendiente = false;
    return activa;
  }
}

/** true si el usuario pidió reducir el movimiento (o no se puede saber). */
export function prefiereMenosMovimiento(): boolean {
  return typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
