import { Cita, Cliente, Consulta, ItemPago, Mascota, Pago, Usuario, Vacuna } from '../models';
import { ultimasDosis } from '../services/vacunas.service';

/** Cálculos del dashboard: funciones puras sobre las colecciones, con `hoy` inyectable para pruebas. */

const DIA_MS = 86400000;

export function inicioDia(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function inicioMes(d: Date, desplazamiento = 0): Date {
  return new Date(d.getFullYear(), d.getMonth() + desplazamiento, 1);
}

export function mismoDia(a: Date | string, b: Date): boolean {
  const x = new Date(a);
  return x.getFullYear() === b.getFullYear() && x.getMonth() === b.getMonth() && x.getDate() === b.getDate();
}

/** Días completos transcurridos desde `fecha` hasta `hoy`. */
export function diasDesde(fecha: Date | string, hoy: Date): number {
  return Math.floor((inicioDia(hoy).getTime() - inicioDia(new Date(fecha)).getTime()) / DIA_MS);
}

/** Fecha en que entró el dinero: la de cobro si un pendiente se cobró después. */
function fechaIngreso(p: Pago): Date {
  return new Date(p.fechaPago ?? p.fecha);
}

const cobrados = (pagos: Pago[]) => pagos.filter(p => p.estado === 'pagado');

function sumar(pagos: Pago[]): number {
  return Math.round(pagos.reduce((s, p) => s + p.total, 0) * 100) / 100;
}

/** Variación porcentual redondeada; null si no hay base con la que comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

// ---------- Negocio ----------

export interface ResumenIngresos {
  /** Cobrado del 1 del mes a hoy. */
  mes: number;
  /** Cobrado en el mismo tramo de días del mes anterior (comparación justa). */
  mismoTramoAnterior: number;
  variacion: number | null;
  /** Mes anterior completo. */
  mesAnterior: number;
  cobros: number;
  ticketPromedio: number;
  /** Ticket promedio del mismo tramo del mes anterior y su variación. */
  ticketTramoAnterior: number;
  variacionTicket: number | null;
}

/**
 * Mismo momento del mes anterior (mismo día y hora; si el mes anterior es más corto,
 * su último día). Así "1–22 oct hasta las 12:00" se compara con "1–22 sep hasta las 12:00".
 */
export function mismoMomentoMesAnterior(hoy: Date): Date {
  const ultimoDiaAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  return new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), ultimoDiaAnt), hoy.getHours(), hoy.getMinutes(), hoy.getSeconds());
}

export function resumenIngresos(pagos: Pago[], hoy: Date): ResumenIngresos {
  const ini = inicioMes(hoy);
  const iniAnt = inicioMes(hoy, -1);
  const finTramoAnt = mismoMomentoMesAnterior(hoy);
  const ok = cobrados(pagos);
  const delMes = ok.filter(p => fechaIngreso(p) >= ini && fechaIngreso(p) <= hoy);
  const tramoAnt = ok.filter(p => fechaIngreso(p) >= iniAnt && fechaIngreso(p) <= finTramoAnt);
  const mesAnt = ok.filter(p => fechaIngreso(p) >= iniAnt && fechaIngreso(p) < ini);
  const mes = sumar(delMes);
  const mismoTramoAnterior = sumar(tramoAnt);
  const ticketPromedio = delMes.length ? Math.round(mes / delMes.length) : 0;
  const ticketTramoAnterior = tramoAnt.length ? Math.round(mismoTramoAnterior / tramoAnt.length) : 0;
  return {
    mes, mismoTramoAnterior, variacion: variacion(mes, mismoTramoAnterior), mesAnterior: sumar(mesAnt),
    cobros: delMes.length, ticketPromedio, ticketTramoAnterior, variacionTicket: variacion(ticketPromedio, ticketTramoAnterior)
  };
}

export interface PuntoMes {
  clave: string;
  /** Nombre corto del mes, p. ej. "may". */
  etiqueta: string;
  /** Nombre completo para tooltip y tabla, p. ej. "mayo de 2026". */
  nombre: string;
  total: number;
  enCurso: boolean;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function ingresosPorMes(pagos: Pago[], hoy: Date, meses = 6): PuntoMes[] {
  const ok = cobrados(pagos);
  const puntos: PuntoMes[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const ini = inicioMes(hoy, -i);
    const fin = inicioMes(hoy, -i + 1);
    puntos.push({
      clave: `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: MESES[ini.getMonth()].charAt(0).toUpperCase() + MESES[ini.getMonth()].slice(1, 3),
      nombre: `${MESES[ini.getMonth()]} de ${ini.getFullYear()}`,
      total: sumar(ok.filter(p => fechaIngreso(p) >= ini && fechaIngreso(p) < fin)),
      enCurso: i === 0
    });
  }
  return puntos;
}

export interface FilaCategoria {
  categoria: ItemPago['categoria'];
  etiqueta: string;
  total: number;
  porcentaje: number;
}

const ETIQUETA_CATEGORIA: Record<ItemPago['categoria'], string> = {
  consulta: 'Consultas', vacuna: 'Vacunas', examen: 'Exámenes', medicamento: 'Medicamentos', cirugia: 'Cirugías', otro: 'Otros'
};

/** Facturado por categoría de servicio en el mes (antes de descuentos), de mayor a menor. */
export function ingresosPorCategoria(pagos: Pago[], hoy: Date): FilaCategoria[] {
  const ini = inicioMes(hoy);
  const totales = new Map<ItemPago['categoria'], number>();
  for (const p of cobrados(pagos).filter(x => fechaIngreso(x) >= ini && fechaIngreso(x) <= hoy)) {
    for (const i of p.items) totales.set(i.categoria, (totales.get(i.categoria) ?? 0) + i.subtotal);
  }
  const total = [...totales.values()].reduce((s, v) => s + v, 0);
  return [...totales.entries()]
    .map(([categoria, t]) => ({ categoria, etiqueta: ETIQUETA_CATEGORIA[categoria], total: Math.round(t), porcentaje: total ? Math.round((t / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

export interface TramoCobro {
  etiqueta: string;
  total: number;
  cantidad: number;
  /** Más de 30 días: requiere gestión. */
  atrasado: boolean;
}

export interface PorCobrar {
  total: number;
  cantidad: number;
  tramos: TramoCobro[];
  /** Pendientes ordenados del más antiguo al más reciente. */
  pendientes: Pago[];
}

export function porCobrar(pagos: Pago[], hoy: Date): PorCobrar {
  const pendientes = pagos.filter(p => p.estado === 'pendiente').sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const tramo = (etiqueta: string, min: number, max: number, atrasado = false): TramoCobro => {
    const enTramo = pendientes.filter(p => { const d = diasDesde(p.fecha, hoy); return d >= min && d <= max; });
    return { etiqueta, total: sumar(enTramo), cantidad: enTramo.length, atrasado };
  };
  return {
    total: sumar(pendientes), cantidad: pendientes.length, pendientes,
    tramos: [tramo('0 a 7 días', 0, 7), tramo('8 a 30 días', 8, 30), tramo('Más de 30 días', 31, Infinity, true)]
  };
}

/**
 * Momento real de una cita: su día con la hora de `cita.hora`. Las citas creadas desde
 * el formulario guardan la fecha a medianoche, así que la hora sale del campo `hora`.
 */
export function momentoCita(c: Pick<Cita, 'fecha' | 'hora'>): Date {
  const d = new Date(c.fecha);
  const [h, m] = (c.hora || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Cita cuya hora ya pasó y que sigue pendiente o confirmada: el paciente no llegó. */
export function esInasistencia(c: Cita, ahora: Date): boolean {
  return (c.estado === 'pendiente' || c.estado === 'confirmada') && momentoCita(c) < ahora;
}

export interface Asistencia {
  /** Citas del mes cuya hora ya pasó (no cuenta las de hoy aún por llegar). */
  programadas: number;
  atendidas: number;
  canceladas: number;
  noAsistieron: number;
  tasaCancelacion: number;
  tasaInasistencia: number;
  inmediatas: number;
  /** Atendidas en el mismo tramo del mes anterior y su variación. */
  atendidasTramoAnterior: number;
  variacionAtendidas: number | null;
}

export function asistenciaMes(citas: Cita[], consultas: Consulta[], hoy: Date): Asistencia {
  const ini = inicioMes(hoy);
  const iniAnt = inicioMes(hoy, -1);
  const finAnt = mismoMomentoMesAnterior(hoy);
  const pasadas = citas.filter(c => { const f = momentoCita(c); return f >= ini && f <= hoy; });
  const atendidas = pasadas.filter(c => c.estado === 'completada').length;
  const canceladas = pasadas.filter(c => c.estado === 'cancelada').length;
  const noAsistieron = pasadas.filter(c => esInasistencia(c, hoy)).length;
  const cerradas = atendidas + canceladas + noAsistieron;
  const atendidasTramoAnterior = citas.filter(c => { const f = momentoCita(c); return c.estado === 'completada' && f >= iniAnt && f <= finAnt; }).length;
  return {
    programadas: pasadas.length, atendidas, canceladas, noAsistieron,
    tasaCancelacion: cerradas ? Math.round((canceladas / cerradas) * 100) : 0,
    tasaInasistencia: cerradas ? Math.round((noAsistieron / cerradas) * 100) : 0,
    inmediatas: consultas.filter(c => c.tipo === 'inmediata' && new Date(c.fecha) >= ini && new Date(c.fecha) <= hoy).length,
    atendidasTramoAnterior, variacionAtendidas: variacion(atendidas, atendidasTramoAnterior)
  };
}

/** Atenciones de hoy con el pago aún pendiente: lo que recepción debe cobrar antes de cerrar. */
export function porCobrarHoy(pagos: Pago[], hoy: Date): Pago[] {
  return pagos.filter(p => p.estado === 'pendiente' && mismoDia(p.fecha, hoy))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export interface FilaVeterinario {
  id: string;
  nombre: string;
  especialidad?: string;
  atenciones: number;
  ingresos: number;
}

/** Atenciones e ingresos cobrados del mes por veterinario (vía la consulta asociada al pago). */
export function porVeterinario(usuarios: Usuario[], consultas: Consulta[], pagos: Pago[], hoy: Date): FilaVeterinario[] {
  const ini = inicioMes(hoy);
  const delMes = consultas.filter(c => new Date(c.fecha) >= ini && new Date(c.fecha) <= hoy);
  const vetDeConsulta = new Map(consultas.map(c => [c.id, c.veterinarioId]));
  const ingresos = new Map<string, number>();
  for (const p of cobrados(pagos).filter(x => fechaIngreso(x) >= ini && fechaIngreso(x) <= hoy)) {
    const vet = p.consultaId ? vetDeConsulta.get(p.consultaId) : undefined;
    if (vet) ingresos.set(vet, (ingresos.get(vet) ?? 0) + p.total);
  }
  return usuarios
    .filter(u => u.rol === 'veterinario' && u.activo)
    .map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellido}`, especialidad: u.especialidad, atenciones: delMes.filter(c => c.veterinarioId === u.id).length, ingresos: Math.round(ingresos.get(u.id) ?? 0) }))
    .sort((a, b) => b.ingresos - a.ingresos);
}

// ---------- Clientes ----------

export interface ClienteSinVolver {
  cliente: Cliente;
  mascotas: string[];
  ultimaVisita: Date;
  dias: number;
}

export interface ResumenClientes {
  /** Con alguna visita en los últimos 90 días. */
  activos: number;
  /** Clientes registrados (activos en el sistema). */
  registrados: number;
  nuevosMes: number;
  nuevosMesAnterior: number;
  /** Clientes cuya última visita fue hace más de 90 días y sin cita futura. */
  sinVolver: ClienteSinVolver[];
  nuevos: Cliente[];
}

export function resumenClientes(clientes: Cliente[], mascotas: Mascota[], consultas: Consulta[], citas: Cita[], hoy: Date): ResumenClientes {
  const activos = clientes.filter(c => c.activo);
  const ultima = new Map<string, Date>();
  for (const c of consultas) {
    const f = new Date(c.fecha);
    if (f <= hoy && (!ultima.has(c.clienteId) || f > ultima.get(c.clienteId)!)) ultima.set(c.clienteId, f);
  }
  const conCitaFutura = new Set(citas.filter(c => new Date(c.fecha) > hoy && c.estado !== 'cancelada').map(c => c.clienteId));
  const mascotasDe = (id: string) => mascotas.filter(m => m.clienteId === id && m.activo).map(m => m.nombre);
  const ini = inicioMes(hoy);
  const iniAnt = inicioMes(hoy, -1);
  const sinVolver = activos
    .filter(c => ultima.has(c.id) && diasDesde(ultima.get(c.id)!, hoy) > 90 && !conCitaFutura.has(c.id))
    .map(c => ({ cliente: c, mascotas: mascotasDe(c.id), ultimaVisita: ultima.get(c.id)!, dias: diasDesde(ultima.get(c.id)!, hoy) }))
    .sort((a, b) => a.dias - b.dias);
  const nuevos = activos.filter(c => new Date(c.fechaRegistro) >= ini && new Date(c.fechaRegistro) <= hoy)
    .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  return {
    activos: activos.filter(c => ultima.has(c.id) && diasDesde(ultima.get(c.id)!, hoy) <= 90).length,
    registrados: activos.length,
    nuevosMes: nuevos.length,
    nuevosMesAnterior: activos.filter(c => { const f = new Date(c.fechaRegistro); return f >= iniAnt && f < ini; }).length,
    sinVolver, nuevos
  };
}

export interface Recordatorio {
  vacuna: Vacuna;
  mascota: Mascota;
  cliente: Cliente;
  /** Negativo: vencida hace N días; positivo: vence en N días. */
  dias: number;
}

/** Última dosis de cada vacuna de mascotas activas que vence dentro de `horizonte` días (incluye vencidas recientes). */
export function recordatoriosVacuna(vacunas: Vacuna[], mascotas: Mascota[], clientes: Cliente[], hoy: Date, horizonte = 30, vencidasHasta = 60): Recordatorio[] {
  const mascota = new Map(mascotas.filter(m => m.activo).map(m => [m.id, m]));
  const cliente = new Map(clientes.filter(c => c.activo).map(c => [c.id, c]));
  return ultimasDosis(vacunas)
    .map(v => ({ v, m: mascota.get(v.mascotaId), c: cliente.get(v.clienteId), dias: -diasDesde(v.proximaFecha, hoy) }))
    .filter(x => x.m && x.c && x.dias <= horizonte && x.dias >= -vencidasHasta)
    .map(x => ({ vacuna: x.v, mascota: x.m!, cliente: x.c!, dias: x.dias }))
    .sort((a, b) => a.dias - b.dias);
}

// ---------- Hoy ----------

export function citasDelDia(citas: Cita[], dia: Date): Cita[] {
  return citas.filter(c => mismoDia(c.fecha, dia)).sort((a, b) => a.hora.localeCompare(b.hora));
}

/** Siguiente día laborable (la clínica no abre los domingos). */
export function siguienteDiaHabil(hoy: Date): Date {
  const d = inicioDia(hoy);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0);
  return d;
}

/** Enlace de WhatsApp para un teléfono panameño (8 dígitos) con un mensaje prellenado. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 7) return null;
  const numero = digitos.length <= 8 ? `507${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
