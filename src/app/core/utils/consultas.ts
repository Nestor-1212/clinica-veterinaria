import { Cita, Consulta, TipoMascota } from '../models';
import { inicioDia, mismoDia, momentoCita } from './metricas';

/**
 * Consultas: rangos clínicos por especie, sala de espera del día y filtros por período.
 * Funciones puras con `ahora` inyectable.
 */

/** Temperatura rectal normal en °C por especie (referencia clínica habitual). Reptiles: depende del ambiente. */
export const RANGO_TEMPERATURA: Record<TipoMascota, [number, number] | null> = {
  Perro: [37.5, 39.2], Gato: [38.0, 39.2], Conejo: [38.5, 40.0], Ave: [40.0, 42.0], Reptil: null, Otro: null
};

export type EstadoTemperatura = 'normal' | 'alta' | 'baja';

export function evaluarTemperatura(temp: number | null | undefined, tipo: TipoMascota): EstadoTemperatura | null {
  const rango = RANGO_TEMPERATURA[tipo];
  if (!rango || temp === null || temp === undefined || isNaN(Number(temp)) || Number(temp) <= 0) return null;
  const t = Number(temp);
  return t > rango[1] ? 'alta' : t < rango[0] ? 'baja' : 'normal';
}

/** Más de 1 °C fuera del rango normal de la especie: se trata como urgencia, no como un aviso. */
export function temperaturaCritica(temp: number | null | undefined, tipo: TipoMascota): boolean {
  const rango = RANGO_TEMPERATURA[tipo];
  if (!rango || temp === null || temp === undefined || isNaN(Number(temp)) || Number(temp) <= 0) return false;
  return Number(temp) >= rango[1] + 1 || Number(temp) <= rango[0] - 1;
}

/** Diferencia de peso con un decimal: "+0.4 kg", "−1.2 kg", "sin cambio". */
export function cambioPeso(actual: number | null | undefined, anterior: number | null | undefined): string | null {
  if (!actual || !anterior) return null;
  const d = Math.round((Number(actual) - Number(anterior)) * 10) / 10;
  if (d === 0) return 'sin cambio';
  return `${d > 0 ? '+' : '−'}${Math.abs(d)} kg`;
}

/**
 * Pacientes de hoy por atender: inmediatas en espera primero (por llegada) y luego las citas
 * pendientes o confirmadas del día por hora. Con `vetId`, solo las de ese veterinario.
 */
export function salaDeEspera(citas: Cita[], ahora: Date, vetId?: string): Cita[] {
  // Primero las inmediatas, luego quienes ya llegaron (por orden de llegada) y al final las citas por llegar
  const peso = (c: Cita) => (c.estado === 'inmediata' ? 0 : c.llegada ? 1 : 2);
  const orden = (c: Cita) => (c.llegada && c.estado !== 'inmediata' ? new Date(c.llegada).getTime() : momentoCita(c).getTime());
  return citas
    .filter(c => mismoDia(c.fecha, ahora) && (c.estado === 'inmediata' || c.estado === 'pendiente' || c.estado === 'confirmada'))
    .filter(c => !vetId || c.veterinarioId === vetId)
    .sort((a, b) => peso(a) - peso(b) || orden(a) - orden(b));
}

export type PeriodoConsultas = 'hoy' | 'semana' | 'mes' | 'todas';

/** Consultas dentro del período, contando hacia atrás desde hoy (semana = 7 días, mes = 30). */
export function enPeriodo(c: Consulta, periodo: PeriodoConsultas, ahora: Date): boolean {
  if (periodo === 'todas') return true;
  const fecha = new Date(c.fecha);
  if (periodo === 'hoy') return mismoDia(fecha, ahora);
  const desde = inicioDia(ahora);
  desde.setDate(desde.getDate() - (periodo === 'semana' ? 6 : 29));
  return fecha >= desde && fecha <= ahora;
}
