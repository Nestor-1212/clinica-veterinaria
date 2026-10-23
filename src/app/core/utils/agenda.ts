import { Cita, Cliente, Mascota } from '../models';
import { inicioDia, mismoDia, momentoCita } from './metricas';

/**
 * Agenda de Citas: tablero del día por veterinario y citas por confirmar.
 * Funciones puras con `ahora` inyectable. Textos de estado compartidos con el dashboard.
 */

export const ESTADO_TEXTO: Record<Cita['estado'], string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Atendida', cancelada: 'Cancelada', inmediata: 'Inmediata'
};
export const ESTADO_CLASE: Record<Cita['estado'], string> = {
  pendiente: 'vs-status--warning', confirmada: 'vs-status--success', completada: 'vs-status--neutral', cancelada: 'vs-status--neutral', inmediata: 'vs-status--accent vs-status--pill'
};

/** Tramos de media hora del horario de la clínica: "07:00" … "20:30". */
export function tramosDelDia(desde = 7, hasta = 20): string[] {
  const t: string[] = [];
  for (let h = desde; h <= hasta; h++) {
    const hh = String(h).padStart(2, '0');
    t.push(`${hh}:00`, `${hh}:30`);
  }
  return t;
}

/** Tramo de media hora al que pertenece una hora: "11:16" → "11:00", "11:45" → "11:30". */
export function tramoDe(hora: string): string {
  const [h, m] = (hora || '00:00').split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
}

/** Clave de una celda del tablero (veterinario + tramo). */
export const celda = (vetId: string, tramo: string) => `${vetId}|${tramo}`;

/** Citas del día por celda (sin canceladas: dejan el hueco libre), ordenadas por hora dentro de la celda. */
export function tableroDelDia(citas: Cita[], dia: Date): Map<string, Cita[]> {
  const mapa = new Map<string, Cita[]>();
  citas
    .filter(c => c.estado !== 'cancelada' && mismoDia(c.fecha, dia))
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .forEach(c => {
      const k = celda(c.veterinarioId, tramoDe(c.hora));
      mapa.set(k, [...(mapa.get(k) ?? []), c]);
    });
  return mapa;
}

export interface ResumenDia {
  total: number;
  porConfirmar: number;
  confirmadas: number;
  enEspera: number;
  atendidas: number;
  /** Pendientes o confirmadas cuya hora ya pasó. */
  noLlegaron: number;
}

export function resumenDelDia(citas: Cita[], dia: Date, ahora: Date): ResumenDia {
  const del = citas.filter(c => c.estado !== 'cancelada' && mismoDia(c.fecha, dia));
  const vigente = (c: Cita) => momentoCita(c) >= ahora;
  return {
    total: del.length,
    porConfirmar: del.filter(c => c.estado === 'pendiente' && vigente(c)).length,
    confirmadas: del.filter(c => c.estado === 'confirmada' && vigente(c)).length,
    enEspera: del.filter(c => c.estado === 'inmediata').length,
    atendidas: del.filter(c => c.estado === 'completada').length,
    noLlegaron: del.filter(c => (c.estado === 'pendiente' || c.estado === 'confirmada') && !vigente(c)).length
  };
}

/** Citas pendientes desde ahora hasta dentro de `dias` días (incluye el último), en orden. */
export function citasPorConfirmar(citas: Cita[], ahora: Date, dias = 7): Cita[] {
  const limite = inicioDia(ahora);
  limite.setDate(limite.getDate() + dias + 1);
  return citas
    .filter(c => c.estado === 'pendiente' && momentoCita(c) >= ahora && momentoCita(c) < limite)
    .sort((a, b) => momentoCita(a).getTime() - momentoCita(b).getTime());
}

/** Recordatorio para WhatsApp: "Hola Ana, le recordamos la cita de Max el lunes 26 de octubre a las 10:00…". */
export function mensajeRecordatorio(cita: Cita, mascota: Mascota | undefined, cliente: Cliente | undefined): string {
  const dia = momentoCita(cita).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' });
  const nombre = cliente?.nombre.split(' ')[0] ?? '';
  return `Hola ${nombre}, le escribimos de la clínica veterinaria para recordarle la cita de ${mascota?.nombre ?? 'su mascota'} el ${dia} a las ${cita.hora}. ¿Nos confirma su asistencia?`;
}
