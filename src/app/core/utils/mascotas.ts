import { Cita, Cliente, Consulta, Mascota, TipoMascota, Vacuna } from '../models';
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

/** Razas frecuentes por especie: sugerencias al registrar (se puede escribir cualquier otra). */
export const RAZAS_FRECUENTES: Record<TipoMascota, string[]> = {
  Perro: ['Mestizo', 'Labrador Retriever', 'Golden Retriever', 'Pastor Alemán', 'Bulldog Francés', 'Poodle', 'Chihuahua', 'Schnauzer', 'Shih Tzu', 'Pitbull', 'Beagle', 'Yorkshire Terrier', 'Husky Siberiano', 'Rottweiler', 'Pug'],
  Gato: ['Doméstico', 'Siamés', 'Persa', 'Angora', 'Maine Coon', 'Bengalí', 'Ragdoll', 'Esfinge'],
  Ave: ['Periquito', 'Cotorra', 'Canario', 'Cacatúa', 'Agapornis', 'Guacamaya'],
  Conejo: ['Holandés', 'Cabeza de León', 'Mini Lop', 'Rex', 'Belier'],
  Reptil: ['Iguana', 'Tortuga', 'Gecko leopardo', 'Dragón barbudo', 'Serpiente del maíz'],
  Otro: ['Hámster', 'Cobayo', 'Hurón', 'Erizo', 'Chinchilla']
};

/** Sugerencias de raza que contienen el texto (sin distinguir tildes ni mayúsculas). */
export function sugerirRazas(tipo: TipoMascota, texto: string): string[] {
  const normal = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const buscado = normal((texto || '').trim());
  const razas = RAZAS_FRECUENTES[tipo] ?? [];
  return buscado ? razas.filter(r => normal(r).includes(buscado)) : razas;
}

/** Años cumplidos a `hoy` desde la fecha de nacimiento (0 si aún no cumple uno; null si no es válida o es futura). */
export function edadEnAnios(nacimiento: Date | string | null | undefined, hoy: Date): number | null {
  if (!nacimiento) return null;
  const n = new Date(nacimiento);
  if (isNaN(n.getTime()) || n > hoy) return null;
  let anios = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) anios--;
  return anios;
}
