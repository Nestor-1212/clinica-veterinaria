import { Cliente, Mascota, TipoMascota, Vacuna } from '../models';
import { ultimasDosis } from '../services/vacunas.service';

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

// ---------- Lista de Vacunas y registro ----------

/** Vacunas habituales por especie (sugerencias al registrar; se puede escribir otra). */
export const VACUNAS_POR_ESPECIE: Record<TipoMascota, string[]> = {
  Perro: ['Óctuple Canina', 'Rabia', 'Parvovirus', 'Moquillo', 'Bordetella', 'Leptospira'],
  Gato: ['Triple Felina', 'Rabia', 'Leucemia Felina'],
  Conejo: ['Mixomatosis', 'Enfermedad hemorrágica'],
  Ave: ['Newcastle', 'Viruela aviar'],
  Reptil: [],
  Otro: ['Rabia']
};

/** Refuerzos habituales: el botón fija la próxima fecha desde la aplicación. */
export const REFUERZOS: { texto: string; dias: number }[] = [
  { texto: '21 días', dias: 21 }, { texto: '1 mes', dias: 30 }, { texto: '6 meses', dias: 182 }, { texto: '1 año', dias: 365 }
];

export function sumarDias(fecha: Date | string, dias: number): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

export type EstadoVacuna = 'vencida' | 'proxima' | 'al-dia';

export interface FilaVacuna {
  /** Dosis más reciente de esa vacuna para esa mascota. */
  vacuna: Vacuna;
  mascota: Mascota;
  cliente?: Cliente;
  estado: EstadoVacuna;
  /** Días hasta la próxima dosis (negativo si ya venció). */
  dias: number;
}

/**
 * Una fila por mascota activa y vacuna (su última dosis), con el estado del refuerzo:
 * vencida, próxima (dentro de `horizonte` días) o al día. Ordenadas por próxima fecha.
 */
export function filasVacunas(vacunas: Vacuna[], mascotas: Mascota[], clientes: Cliente[], hoy: Date, horizonte = 30): FilaVacuna[] {
  const mascota = new Map(mascotas.filter(m => m.activo).map(m => [m.id, m]));
  const cliente = new Map(clientes.map(c => [c.id, c]));
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  return ultimasDosis(vacunas)
    .filter(v => mascota.has(v.mascotaId))
    .map(v => {
      const m = mascota.get(v.mascotaId)!;
      const proxima = new Date(v.proximaFecha);
      proxima.setHours(0, 0, 0, 0);
      const dias = Math.round((proxima.getTime() - inicio.getTime()) / 86400000);
      const estado: EstadoVacuna = dias < 0 ? 'vencida' : dias <= horizonte ? 'proxima' : 'al-dia';
      return { vacuna: v, mascota: m, cliente: cliente.get(m.clienteId), estado, dias };
    })
    .sort((a, b) => a.dias - b.dias);
}

/** "vencida hace 12 días", "vence hoy", "en 5 días", "en 3 meses". */
export function textoVencimiento(dias: number): string {
  if (dias === 0) return 'vence hoy';
  const n = Math.abs(dias);
  const meses = Math.round(n / 30);
  const anios = Math.round(n / 365);
  const t = n < 30 ? `${n} ${n === 1 ? 'día' : 'días'}`
    : n < 365 ? `${meses} ${meses === 1 ? 'mes' : 'meses'}`
      : `${anios} ${anios === 1 ? 'año' : 'años'}`;
  return dias < 0 ? `vencida hace ${t}` : `en ${t}`;
}

/** Recordatorio para WhatsApp. */
export function mensajeVacuna(f: FilaVacuna): string {
  const nombre = f.cliente?.nombre.split(' ')[0] ?? '';
  const cuando = f.dias < 0
    ? 'ya le corresponde'
    : `le corresponde el ${new Date(f.vacuna.proximaFecha).toLocaleDateString('es-PA', { day: 'numeric', month: 'long' })}`;
  return `Hola ${nombre}, le escribimos de la clínica veterinaria: a ${f.mascota.nombre} ${cuando} el refuerzo de la vacuna ${f.vacuna.nombre}. ¿Le agendamos una cita?`;
}

/** Última dosis aplicada de una vacuna a una mascota (para mostrarla al registrar la siguiente). */
export function ultimaDosisDe(vacunas: Vacuna[], mascotaId: string, nombre: string, excluirId?: string): Vacuna | undefined {
  const n = (nombre || '').trim().toLowerCase();
  if (!mascotaId || !n) return undefined;
  return vacunas
    .filter(v => v.mascotaId === mascotaId && v.id !== excluirId && v.nombre.trim().toLowerCase() === n)
    .sort((a, b) => new Date(b.fechaAplicacion).getTime() - new Date(a.fechaAplicacion).getTime())[0];
}
