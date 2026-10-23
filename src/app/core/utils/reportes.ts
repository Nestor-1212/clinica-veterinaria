import { Cita, Cliente, Consulta, Mascota, MetodoPago, Pago, TipoMascota, Usuario } from '../models';
import { esInasistencia, inicioDia, inicioMes, momentoCita, mismoMomentoMesAnterior, variacion } from './metricas';
import { METODO_TEXTO, redondearCentavos } from './pagos';

/**
 * Reportes por período con comparación contra el período anterior equivalente.
 * Funciones puras con `hoy` inyectable; los ingresos cuentan por fecha de cobro.
 */

export type Periodo = 'mes' | 'mesAnterior' | 'trimestre' | 'anio';

export interface Rango { desde: Date; hasta: Date; etiqueta: string; }
export interface RangoPeriodo extends Rango { anterior: Rango; }

const MES = (d: Date) => d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
const CORTO = (d: Date) => d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }).replace('.', '');

export function rangoPeriodo(p: Periodo, hoy: Date): RangoPeriodo {
  switch (p) {
    case 'mesAnterior': {
      const desde = inicioMes(hoy, -1);
      const hasta = new Date(inicioMes(hoy).getTime() - 1);
      const antDesde = inicioMes(hoy, -2);
      return { desde, hasta, etiqueta: MES(desde), anterior: { desde: antDesde, hasta: new Date(desde.getTime() - 1), etiqueta: MES(antDesde) } };
    }
    case 'trimestre':
    case 'anio': {
      const dias = p === 'trimestre' ? 90 : 365;
      const desde = inicioDia(hoy);
      desde.setDate(desde.getDate() - (dias - 1));
      const antDesde = new Date(desde);
      antDesde.setDate(antDesde.getDate() - dias);
      const antHasta = new Date(desde.getTime() - 1);
      return {
        desde, hasta: hoy, etiqueta: `${CORTO(desde)} – ${CORTO(hoy)}`,
        anterior: { desde: antDesde, hasta: antHasta, etiqueta: `${CORTO(antDesde)} – ${CORTO(antHasta)}` }
      };
    }
    default: {
      const desde = inicioMes(hoy);
      const antDesde = inicioMes(hoy, -1);
      const antHasta = mismoMomentoMesAnterior(hoy);
      return { desde, hasta: hoy, etiqueta: MES(hoy), anterior: { desde: antDesde, hasta: antHasta, etiqueta: `${CORTO(antDesde)} – ${CORTO(antHasta)}` } };
    }
  }
}

const en = (f: Date | string, r: Rango) => { const d = new Date(f); return d >= r.desde && d <= r.hasta; };
const cobro = (p: Pago) => new Date(p.fechaPago ?? p.fecha);
const cobradosEn = (pagos: Pago[], r: Rango) => pagos.filter(p => p.estado === 'pagado' && en(cobro(p), r));

export interface Indicadores {
  ingresos: number;
  cobros: number;
  ticket: number;
  atenciones: number;
  clientesNuevos: number;
  /** % de citas cuya hora pasó sin atención ni cancelación. */
  inasistencia: number;
}

export function indicadores(r: Rango, pagos: Pago[], consultas: Consulta[], clientes: Cliente[], citas: Cita[], hoy: Date): Indicadores {
  const cobrados = cobradosEn(pagos, r);
  const ingresos = redondearCentavos(cobrados.reduce((s, p) => s + p.total, 0));
  const pasadas = citas.filter(c => { const m = momentoCita(c); return m >= r.desde && m <= r.hasta && m <= hoy; });
  const atendidas = pasadas.filter(c => c.estado === 'completada').length;
  const canceladas = pasadas.filter(c => c.estado === 'cancelada').length;
  const noLlegaron = pasadas.filter(c => esInasistencia(c, hoy)).length;
  const cerradas = atendidas + canceladas + noLlegaron;
  return {
    ingresos, cobros: cobrados.length, ticket: cobrados.length ? Math.round(ingresos / cobrados.length) : 0,
    atenciones: consultas.filter(c => en(c.fecha, r)).length,
    clientesNuevos: clientes.filter(c => en(c.fechaRegistro, r)).length,
    inasistencia: cerradas ? Math.round((noLlegaron / cerradas) * 100) : 0
  };
}

export interface Comparado { actual: number; anterior: number; variacion: number | null; }

export function comparar(actual: Indicadores, anterior: Indicadores): Record<keyof Indicadores, Comparado> {
  const c = (k: keyof Indicadores): Comparado => ({ actual: actual[k], anterior: anterior[k], variacion: variacion(actual[k], anterior[k]) });
  return { ingresos: c('ingresos'), cobros: c('cobros'), ticket: c('ticket'), atenciones: c('atenciones'), clientesNuevos: c('clientesNuevos'), inasistencia: c('inasistencia') };
}

export interface FilaServicio { servicio: string; cantidad: number; total: number; porcentaje: number; }

/** Servicios cobrados en el período por descripción (antes de descuentos), de mayor a menor ingreso. */
export function serviciosTop(pagos: Pago[], r: Rango, limite = 10): FilaServicio[] {
  const mapa = new Map<string, { servicio: string; cantidad: number; total: number }>();
  for (const p of cobradosEn(pagos, r)) for (const i of p.items) {
    const k = i.descripcion.trim().toLowerCase();
    const a = mapa.get(k) ?? { servicio: i.descripcion.trim(), cantidad: 0, total: 0 };
    a.cantidad += i.cantidad;
    a.total += i.subtotal;
    mapa.set(k, a);
  }
  const total = [...mapa.values()].reduce((s, v) => s + v.total, 0);
  return [...mapa.values()]
    .map(v => ({ ...v, total: redondearCentavos(v.total), porcentaje: total ? Math.round((v.total / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total || b.cantidad - a.cantidad)
    .slice(0, limite);
}

export interface FilaConteo { nombre: string; cantidad: number; porcentaje: number; }

function conteo(valores: string[], limite: number): FilaConteo[] {
  const mapa = new Map<string, { nombre: string; cantidad: number }>();
  for (const v of valores) {
    const k = v.trim().toLowerCase();
    if (!k) continue;
    const a = mapa.get(k) ?? { nombre: v.trim(), cantidad: 0 };
    a.cantidad++;
    mapa.set(k, a);
  }
  const total = [...mapa.values()].reduce((s, v) => s + v.cantidad, 0);
  return [...mapa.values()]
    .map(v => ({ ...v, porcentaje: total ? Math.round((v.cantidad / total) * 100) : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limite);
}

/** Diagnósticos más frecuentes del período ("Paciente sano" incluido: dice cuántos controles hubo). */
export function diagnosticosTop(consultas: Consulta[], r: Rango, limite = 8): FilaConteo[] {
  return conteo(consultas.filter(c => en(c.fecha, r)).map(c => c.diagnostico), limite);
}

/** Atenciones del período por especie del paciente. */
export function atencionesPorEspecie(consultas: Consulta[], mascotas: Mascota[], r: Rango): FilaConteo[] {
  const tipo = new Map(mascotas.map(m => [m.id, m.tipo as TipoMascota]));
  return conteo(consultas.filter(c => en(c.fecha, r)).map(c => tipo.get(c.mascotaId) ?? 'Otro'), 10);
}

export interface FilaVet { nombre: string; especialidad: string; atenciones: number; inmediatas: number; ingresos: number; }

/** Atenciones e ingresos cobrados del período por veterinario (vía la consulta del pago). */
export function rendimientoVeterinarios(usuarios: Usuario[], consultas: Consulta[], pagos: Pago[], r: Rango): FilaVet[] {
  const delPeriodo = consultas.filter(c => en(c.fecha, r));
  const vetDe = new Map(consultas.map(c => [c.id, c.veterinarioId]));
  const ingresos = new Map<string, number>();
  for (const p of cobradosEn(pagos, r)) {
    const v = p.consultaId ? vetDe.get(p.consultaId) : undefined;
    if (v) ingresos.set(v, (ingresos.get(v) ?? 0) + p.total);
  }
  return usuarios
    .filter(u => u.rol === 'veterinario')
    .map(u => {
      const suyas = delPeriodo.filter(c => c.veterinarioId === u.id);
      return { nombre: `${u.nombre} ${u.apellido}`, especialidad: u.especialidad ?? '', atenciones: suyas.length, inmediatas: suyas.filter(c => c.tipo === 'inmediata').length, ingresos: redondearCentavos(ingresos.get(u.id) ?? 0) };
    })
    .filter(f => f.atenciones || f.ingresos)
    .sort((a, b) => b.ingresos - a.ingresos || b.atenciones - a.atenciones);
}

export interface FilaMetodoPeriodo { metodo: string; cobros: number; total: number; porcentaje: number; }

export function metodosPeriodo(pagos: Pago[], r: Rango): FilaMetodoPeriodo[] {
  const cobrados = cobradosEn(pagos, r);
  const total = cobrados.reduce((s, p) => s + p.total, 0);
  return (Object.keys(METODO_TEXTO) as MetodoPago[])
    .map(m => {
      const de = cobrados.filter(p => p.metodoPago === m);
      const t = de.reduce((s, p) => s + p.total, 0);
      return { metodo: METODO_TEXTO[m], cobros: de.length, total: redondearCentavos(t), porcentaje: total ? Math.round((t / total) * 100) : 0 };
    })
    .filter(f => f.cobros)
    .sort((a, b) => b.total - a.total);
}

/** CSV con BOM (Excel reconoce las tildes); celdas entre comillas si hace falta. */
export function aCsv(encabezados: string[], filas: (string | number)[][]): string {
  const celda = (v: string | number) => {
    const t = String(v);
    return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [encabezados, ...filas].map(f => f.map(celda).join(',')).join('\r\n');
}
