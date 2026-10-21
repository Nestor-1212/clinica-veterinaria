import { Vacuna } from '../models';

export type EstadoRecordatorio = 'vencida' | 'proxima';

/**
 * Estado de presentación del recordatorio de una vacuna pendiente:
 * 'vencida' si su próxima fecha ya pasó, 'proxima' en caso contrario.
 * Mismo criterio que usaba el dashboard (proximaFecha < hoy).
 */
export function estadoRecordatorio(v: Pick<Vacuna, 'proximaFecha'>, hoy: Date = new Date()): EstadoRecordatorio {
  return new Date(v.proximaFecha) < hoy ? 'vencida' : 'proxima';
}

/** Ordena por próxima fecha ascendente (las vencidas primero). */
export function porProximaFecha<T extends Pick<Vacuna, 'proximaFecha'>>(a: T, b: T): number {
  return new Date(a.proximaFecha).getTime() - new Date(b.proximaFecha).getTime();
}
