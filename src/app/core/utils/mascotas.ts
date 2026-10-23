import { Cita, Cliente, Consulta, Mascota, Vacuna } from '../models';
import { EstadoVacunas, estadoVacunas, proximaCita } from './clientes';

/**
 * Datos derivados de la lista de Mascotas: cada fila responde "¿quién es este
 * paciente y qué necesita?". Funciones puras con `hoy` inyectable.
 */

export interface FilaMascota {
  mascota: Mascota;
  cliente: Cliente | undefined;
  /** Consulta más reciente hasta hoy. */
  ultimaConsulta: Consulta | null;
  /** Siguiente cita pendiente o confirmada desde ahora. */
  proximaCita: Cita | null;
  vacunas: EstadoVacunas;
}

export type SegmentoMascotas = 'todos' | 'vacunas' | 'alergias' | 'cita';

export function filasMascotas(
  mascotas: Mascota[], clientes: Cliente[], consultas: Consulta[], citas: Cita[], vacunas: Vacuna[], hoy: Date
): FilaMascota[] {
  const clientePorId = new Map(clientes.map(c => [c.id, c]));
  return mascotas.filter(m => m.activo).map(mascota => {
    const ultimaConsulta = consultas
      .filter(c => c.mascotaId === mascota.id && new Date(c.fecha) <= hoy)
      .reduce<Consulta | null>((ultima, c) => !ultima || new Date(c.fecha) > new Date(ultima.fecha) ? c : ultima, null);
    return {
      mascota,
      cliente: clientePorId.get(mascota.clienteId),
      ultimaConsulta,
      proximaCita: proximaCita(citas.filter(c => c.mascotaId === mascota.id), hoy),
      vacunas: estadoVacunas(vacunas, mascota.id, hoy)
    };
  });
}

export function enSegmentoMascotas(f: FilaMascota, s: SegmentoMascotas): boolean {
  switch (s) {
    case 'vacunas': return f.vacunas.estado === 'vencidas';
    case 'alergias': return !!f.mascota.alergias?.trim();
    case 'cita': return !!f.proximaCita;
    default: return true;
  }
}

export function conteoSegmentosMascotas(filas: FilaMascota[]): Record<SegmentoMascotas, number> {
  const contar = (s: SegmentoMascotas) => filas.filter(f => enSegmentoMascotas(f, s)).length;
  return { todos: filas.length, vacunas: contar('vacunas'), alergias: contar('alergias'), cita: contar('cita') };
}
