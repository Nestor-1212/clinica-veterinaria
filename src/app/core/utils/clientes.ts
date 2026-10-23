import { Cita, Cliente, Consulta, Mascota, Pago, TipoMascota, Vacuna } from '../models';
import { ultimasDosis } from '../services/vacunas.service';
import { diasDesde, momentoCita, resumenClientes } from './metricas';
import { redondearCentavos } from './pagos';
import { estadoRecordatorio } from './vacunas';

/**
 * Datos derivados del módulo Clientes (lista y expediente). Funciones puras con `hoy`
 * inyectable; "para recuperar" y "nuevo este mes" salen de resumenClientes para que
 * la lista y el dashboard cuenten lo mismo.
 */

/** Icono de Material Icons por especie (el nombre de la especie siempre acompaña al icono). */
export const ICONO_ESPECIE: Record<TipoMascota, string> = {
  Perro: 'pets', Gato: 'pets', Ave: 'flutter_dash', Conejo: 'cruelty_free', Reptil: 'eco', Otro: 'pest_control_rodent'
};

/** "hoy", "ayer", "hace 12 días", "hace 3 meses", "en 5 días", "en 2 meses", "hace 1 año". */
export function tiempoRelativo(fecha: Date | string, hoy: Date): string {
  const d = diasDesde(fecha, hoy);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d === -1) return 'mañana';
  const n = Math.abs(d);
  const texto = n < 30 ? `${n} días`
    : n < 365 ? (Math.floor(n / 30) === 1 ? '1 mes' : `${Math.floor(n / 30)} meses`)
      : (Math.floor(n / 365) === 1 ? '1 año' : `${Math.floor(n / 365)} años`);
  return d > 0 ? `hace ${texto}` : `en ${texto}`;
}

export interface MascotaBreve {
  id: string;
  nombre: string;
  tipo: TipoMascota;
}

export interface FilaCliente {
  cliente: Cliente;
  /** Mascotas activas, en orden alfabético. */
  mascotas: MascotaBreve[];
  /** Última consulta hasta hoy (misma definición de "visita" que el dashboard). */
  ultimaVisita: Date | null;
  /** Siguiente cita pendiente o confirmada desde ahora. */
  proximaCita: Cita | null;
  /** Suma de pagos pendientes. */
  saldo: number;
  /** Más de 90 días sin venir y sin cita futura. */
  paraRecuperar: boolean;
  /** Registrado este mes. */
  nuevo: boolean;
}

export type SegmentoClientes = 'todos' | 'saldo' | 'recuperar' | 'nuevos';

/** Próxima cita (pendiente o confirmada) a partir de `hoy`, o null. */
export function proximaCita(citas: Cita[], hoy: Date): Cita | null {
  return citas
    .filter(c => (c.estado === 'pendiente' || c.estado === 'confirmada') && momentoCita(c) >= hoy)
    .sort((a, b) => momentoCita(a).getTime() - momentoCita(b).getTime())[0] ?? null;
}

/** Fecha de la consulta más reciente hasta `hoy`, o null. */
export function ultimaVisita(consultas: Consulta[], hoy: Date): Date | null {
  let ultima: Date | null = null;
  for (const c of consultas) {
    const f = new Date(c.fecha);
    if (f <= hoy && (!ultima || f > ultima)) ultima = f;
  }
  return ultima;
}

const sumarEstado = (pagos: Pago[], estado: Pago['estado']) =>
  redondearCentavos(pagos.filter(p => p.estado === estado).reduce((s, p) => s + p.total, 0));

/** Agrupa una colección por clienteId (una sola pasada, para no filtrar por fila). */
function porCliente<T extends { clienteId: string }>(items: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of items) {
    const lista = m.get(i.clienteId);
    if (lista) lista.push(i); else m.set(i.clienteId, [i]);
  }
  return m;
}

/** Filas de la lista de clientes activos con lo que se necesita al atender. */
export function filasClientes(clientes: Cliente[], mascotas: Mascota[], consultas: Consulta[], citas: Cita[], pagos: Pago[], hoy: Date): FilaCliente[] {
  const resumen = resumenClientes(clientes, mascotas, consultas, citas, hoy);
  const recuperar = new Set(resumen.sinVolver.map(s => s.cliente.id));
  const nuevos = new Set(resumen.nuevos.map(c => c.id));
  const mascotasDe = porCliente(mascotas.filter(m => m.activo));
  const consultasDe = porCliente(consultas);
  const citasDe = porCliente(citas);
  const pagosDe = porCliente(pagos);
  return clientes.filter(c => c.activo).map(c => ({
    cliente: c,
    mascotas: (mascotasDe.get(c.id) ?? []).map(m => ({ id: m.id, nombre: m.nombre, tipo: m.tipo })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    ultimaVisita: ultimaVisita(consultasDe.get(c.id) ?? [], hoy),
    proximaCita: proximaCita(citasDe.get(c.id) ?? [], hoy),
    saldo: sumarEstado(pagosDe.get(c.id) ?? [], 'pendiente'),
    paraRecuperar: recuperar.has(c.id),
    nuevo: nuevos.has(c.id)
  }));
}

export function enSegmento(fila: FilaCliente, segmento: SegmentoClientes): boolean {
  switch (segmento) {
    case 'saldo': return fila.saldo > 0;
    case 'recuperar': return fila.paraRecuperar;
    case 'nuevos': return fila.nuevo;
    default: return true;
  }
}

export function conteoSegmentos(filas: FilaCliente[]): Record<SegmentoClientes, number> {
  return {
    todos: filas.length,
    saldo: filas.filter(f => enSegmento(f, 'saldo')).length,
    recuperar: filas.filter(f => enSegmento(f, 'recuperar')).length,
    nuevos: filas.filter(f => enSegmento(f, 'nuevos')).length
  };
}

// ---------- Expediente ----------

export interface ResumenExpediente {
  ultimaVisita: Date | null;
  proximaCita: Cita | null;
  totalPagado: number;
  saldo: number;
  /** Pagos pendientes, del más antiguo al más reciente. */
  pendientes: Pago[];
}

/** Resumen de un cliente a partir de SUS colecciones (ya filtradas por cliente). */
export function resumenExpediente(consultas: Consulta[], citas: Cita[], pagos: Pago[], hoy: Date): ResumenExpediente {
  return {
    ultimaVisita: ultimaVisita(consultas, hoy),
    proximaCita: proximaCita(citas, hoy),
    totalPagado: sumarEstado(pagos, 'pagado'),
    saldo: sumarEstado(pagos, 'pendiente'),
    pendientes: pagos.filter(p => p.estado === 'pendiente').sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  };
}

export interface EstadoVacunas {
  estado: 'al-dia' | 'vencidas' | 'sin-registro';
  /** Nombres de las vacunas cuya próxima dosis ya pasó. */
  vencidas: string[];
}

/** Estado de vacunación de una mascota según la última dosis de cada vacuna. */
export function estadoVacunas(vacunas: Vacuna[], mascotaId: string, hoy: Date): EstadoVacunas {
  const ultimas = ultimasDosis(vacunas.filter(v => v.mascotaId === mascotaId));
  if (!ultimas.length) return { estado: 'sin-registro', vencidas: [] };
  const vencidas = ultimas.filter(v => estadoRecordatorio(v, hoy) === 'vencida').map(v => v.nombre).sort((a, b) => a.localeCompare(b, 'es'));
  return { estado: vencidas.length ? 'vencidas' : 'al-dia', vencidas };
}

export type TipoEvento = 'consulta' | 'cita' | 'pago' | 'vacuna';

export interface EventoHistorial {
  id: string;
  tipo: TipoEvento;
  fecha: Date;
  /** Texto principal: diagnóstico, motivo, concepto o vacuna. */
  titulo: string;
  mascotaId: string;
  /** Estado del registro (cita.estado, pago.estado, consulta.tipo); las vacunas no tienen. */
  estado?: string;
  /** Importe (solo pagos). */
  total?: number;
  /** Próxima dosis (solo vacunas). */
  proximaFecha?: Date;
  /** Cita aún por venir. */
  futuro: boolean;
}

/**
 * Línea de tiempo unificada de un cliente, de lo más reciente a lo más antiguo.
 * Una cita que ya tiene su consulta registrada no se repite: la consulta la representa.
 */
export function historialCliente(citas: Cita[], consultas: Consulta[], pagos: Pago[], vacunas: Vacuna[], hoy: Date): EventoHistorial[] {
  const atendidas = new Set(consultas.map(c => c.citaId).filter(Boolean));
  const eventos: EventoHistorial[] = [
    ...consultas.map(c => ({
      id: c.id, tipo: 'consulta' as const, fecha: new Date(c.fecha), titulo: c.diagnostico || 'Consulta', mascotaId: c.mascotaId, estado: c.tipo, futuro: false
    })),
    ...citas.filter(c => !atendidas.has(c.id)).map(c => ({
      id: c.id, tipo: 'cita' as const, fecha: momentoCita(c), titulo: c.motivo || 'Cita', mascotaId: c.mascotaId, estado: c.estado,
      futuro: momentoCita(c) >= hoy && c.estado !== 'cancelada' && c.estado !== 'completada'
    })),
    ...pagos.map(p => ({
      id: p.id, tipo: 'pago' as const, fecha: new Date(p.fecha), titulo: p.items.map(i => i.descripcion).filter(Boolean).join(', ') || 'Pago',
      mascotaId: p.mascotaId, estado: p.estado, total: p.total, futuro: false
    })),
    ...vacunas.map(v => ({
      id: v.id, tipo: 'vacuna' as const, fecha: new Date(v.fechaAplicacion), titulo: v.nombre, mascotaId: v.mascotaId,
      proximaFecha: new Date(v.proximaFecha), futuro: false
    }))
  ];
  return eventos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

/** Teléfono de Panamá con guion: "60001111" → "6000-1111", "2201234" → "220-1234". Otros formatos quedan igual. */
export function formatearTelefono(telefono: string): string {
  const t = (telefono || '').trim();
  if (!/^[\d\s-]+$/.test(t)) return t;
  const d = t.replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return t;
}
