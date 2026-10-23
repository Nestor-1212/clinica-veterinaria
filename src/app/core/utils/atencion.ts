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
