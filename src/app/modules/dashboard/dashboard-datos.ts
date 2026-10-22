import { formatNumber } from '@angular/common';
import { Cita, Cliente, Consulta, Mascota, Pago, RolUsuario, TipoMascota, Usuario, Vacuna } from '../../core/models';

/** Colecciones leídas una sola vez por el dashboard y compartidas por sus pestañas. */
export interface DatosDashboard {
  hoy: Date;
  rol: RolUsuario;
  usuarioId: string;
  clientes: Cliente[];
  mascotas: Mascota[];
  citas: Cita[];
  consultas: Consulta[];
  pagos: Pago[];
  vacunas: Vacuna[];
  usuarios: Usuario[];
  /** Búsquedas por id ya resueltas (evita recorrer colecciones en las plantillas). */
  cliente: Map<string, Cliente>;
  mascota: Map<string, Mascota>;
  usuario: Map<string, Usuario>;
}

export function moneda(v: number): string {
  return `$${formatNumber(v, 'es', '1.0-0')}`;
}

export function entero(v: number): string {
  return formatNumber(v, 'es', '1.0-0');
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "1–22 sep": el tramo del mes anterior con el que se compara el mes en curso. */
export function tramoAnterior(hoy: Date): string {
  const ant = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  return `vs. 1–${Math.min(hoy.getDate(), ultimo)} ${MESES_CORTOS[ant.getMonth()]}`;
}

export const ICONO_ESPECIE: Record<TipoMascota, string> = {
  Perro: 'pets', Gato: 'pets', Ave: 'flutter_dash', Conejo: 'cruelty_free', Reptil: 'eco', Otro: 'pest_control_rodent'
};

/** "1 cita" / "3 citas" (plural regular o indicado). */
export function plural(n: number, singular: string, pluralForma = singular + 's'): string {
  return `${formatNumber(n, 'es', '1.0-0')} ${n === 1 ? singular : pluralForma}`;
}

/** "hoy", "mañana", "en 5 días", "hace 3 días". */
export function enDias(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}
