import { Cita, Usuario } from '../models';
import { momentoCita, mismoDia } from './metricas';

/** Motivos de urgencia frecuentes: se suman al texto con un toque y luego se puede detallar. */
export const MOTIVOS_FRECUENTES = [
  'Vómitos', 'Diarrea', 'Cojera', 'Herida o sangrado', 'No come', 'Dificultad para respirar',
  'Posible intoxicación', 'Convulsiones', 'Golpe o caída', 'Decaimiento'
] as const;

/** Agrega un motivo al texto sin repetirlo: "Vómitos" → "Vómitos, Diarrea". */
export function agregarMotivo(texto: string, motivo: string): string {
  const actual = (texto || '').trim();
  if (!actual) return motivo;
  const partes = actual.split(',').map(p => p.trim().toLowerCase());
  if (partes.includes(motivo.toLowerCase())) return actual;
  return `${actual}, ${motivo}`;
}

export interface DisponibilidadVet {
  vet: Usuario;
  /** Sin cita en los próximos 30 minutos (ni una en curso desde hace menos de 30). */
  libre: boolean;
  /** Texto para mostrar: "Sin citas hasta las 14:00", "Tiene cita a las 11:30"… */
  detalle: string;
  /** Atenciones inmediatas de hoy aún sin atender asignadas a este veterinario. */
  enEspera: number;
}

const VENTANA_MS = 30 * 60 * 1000;

/**
 * Disponibilidad de cada veterinario para atender ahora, según su agenda de hoy.
 * La app no registra la duración de las citas: se considera ocupado si tiene una cita
 * pendiente o confirmada que empezó hace menos de 30 minutos o empieza en los próximos 30.
 * Primero los libres; dentro de cada grupo, por menos atenciones en espera.
 */
export function disponibilidadVeterinarios(vets: Usuario[], citas: Cita[], ahora: Date): DisponibilidadVet[] {
  const deHoy = citas.filter(c => mismoDia(c.fecha, ahora));
  return vets
    .map(vet => {
      const suyas = deHoy.filter(c => c.veterinarioId === vet.id);
      const activas = suyas
        .filter(c => c.estado === 'pendiente' || c.estado === 'confirmada')
        .map(c => ({ c, t: momentoCita(c).getTime() }))
        .filter(x => x.t >= ahora.getTime() - VENTANA_MS)
        .sort((a, b) => a.t - b.t);
      const enEspera = suyas.filter(c => c.estado === 'inmediata').length;
      const proxima = activas[0];
      const ocupado = !!proxima && proxima.t < ahora.getTime() + VENTANA_MS;
      const detalle = ocupado
        ? `Tiene cita a las ${proxima.c.hora}`
        : proxima ? `Sin citas hasta las ${proxima.c.hora}` : 'Sin más citas hoy';
      return { vet, libre: !ocupado, detalle, enEspera };
    })
    .sort((a, b) => Number(b.libre) - Number(a.libre) || a.enEspera - b.enEspera);
}

/** Motivos frecuentes de una cita programada. */
export const MOTIVOS_PROGRAMADOS = [
  'Control general', 'Vacunación', 'Desparasitación', 'Revisión de resultados', 'Control post-operatorio',
  'Limpieza dental', 'Esterilización', 'Problema de piel', 'Revisión de oídos'
] as const;

export interface Horario {
  hora: string;
  /** libre, ocupada (el veterinario ya tiene una cita) o pasada (hoy, hora ya transcurrida). */
  estado: 'libre' | 'ocupada' | 'pasada';
}

/** Citas pendientes o confirmadas de un veterinario en un día. */
export function citasDelDia(citas: Cita[], vetId: string, dia: Date): Cita[] {
  return citas.filter(c => c.veterinarioId === vetId && mismoDia(c.fecha, dia) && (c.estado === 'pendiente' || c.estado === 'confirmada'));
}

/** Estado de cada tramo horario de un día para un veterinario (sin veterinario, solo se descartan las horas pasadas). */
export function horariosDelDia(horas: string[], citas: Cita[], vetId: string, dia: Date, ahora: Date): Horario[] {
  const ocupadas = new Set(vetId ? citasDelDia(citas, vetId, dia).map(c => c.hora) : []);
  const esHoy = mismoDia(dia, ahora);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  return horas.map(hora => {
    const [h, m] = hora.split(':').map(Number);
    const estado = esHoy && h * 60 + m <= minutosAhora ? 'pasada' : ocupadas.has(hora) ? 'ocupada' : 'libre';
    return { hora, estado };
  });
}
