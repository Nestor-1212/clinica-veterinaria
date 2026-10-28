import { DeltaKpi } from './kpi.component';

/** Con menos de esta cantidad en el período anterior, un porcentaje exagera ("+400 %" de 1 a 5). */
export const BASE_MINIMA_PORCENTAJE = 10;

/**
 * Qué se compara:
 * - 'monto': dinero, variación en porcentaje.
 * - 'conteo': cantidades; con una base anterior pequeña se muestra la diferencia absoluta.
 * - 'tasa': porcentajes (inasistencia); la diferencia va en puntos porcentuales, no en % de un %.
 */
export type TipoDelta = 'monto' | 'conteo' | 'tasa';

/**
 * Variación de una cifra contra el período anterior, en la unidad que se lee bien.
 * `contra` es el período tal como se muestra ("vs. 1–27 sept"). Devuelve null si no hay con qué comparar.
 */
export function deltaDe(actual: number, anterior: number, tipo: TipoDelta, contra: string, subirEsBueno = true): DeltaKpi | null {
  if (tipo === 'tasa') {
    return { porcentaje: Math.round((actual - anterior) * 10) / 10, unidad: 'puntos', contra, subirEsBueno };
  }
  if (tipo === 'conteo' && anterior < BASE_MINIMA_PORCENTAJE) {
    if (!actual && !anterior) return null;
    const periodo = contra.replace(/^vs\.\s*/, '');
    const base = `vs. ${anterior.toLocaleString('es-PA')}`;
    return { porcentaje: actual - anterior, unidad: 'cantidad', contra: periodo ? `${base} en ${periodo}` : base, subirEsBueno };
  }
  if (anterior <= 0) return null;
  return { porcentaje: Math.round(((actual - anterior) / anterior) * 100), contra, subirEsBueno };
}
