/** Reglas de cálculo de pagos (sin impuestos: la app no los maneja todavía). */

export interface LineaCobro {
  cantidad?: number | null;
  precioUnitario?: number | null;
}

import { ItemPago, MetodoPago, Pago } from '../models';

/** Redondea a centavos para evitar arrastre de decimales binarios (0.1 + 0.2). */
export function redondearCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function subtotalLineas(lineas: LineaCobro[]): number {
  return redondearCentavos(lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0));
}

/** B10: el descuento no puede ser negativo ni mayor que el subtotal. */
export function descuentoValido(subtotal: number, descuento: number): boolean {
  const d = Number(descuento) || 0;
  return d >= 0 && redondearCentavos(d) <= redondearCentavos(subtotal);
}

/** Total = subtotal − descuento. Lanza si el descuento no es válido, para no guardar datos incoherentes. */
export function totalPago(subtotal: number, descuento: number): number {
  if (!descuentoValido(subtotal, descuento)) throw new Error('El descuento no puede superar el subtotal');
  return redondearCentavos(subtotal - (Number(descuento) || 0));
}

// ---------- Lista de Pagos ----------

export const METODO_TEXTO: Record<MetodoPago, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yappy: 'Yappy', transferencia: 'Transferencia' };
export const METODO_ICONO: Record<MetodoPago, string> = { efectivo: 'payments', tarjeta: 'credit_card', yappy: 'smartphone', transferencia: 'account_balance' };

/** Día en que entró el dinero: la fecha de cobro si estaba pendiente, si no la del pago. */
export const fechaCobro = (p: Pago): Date => new Date(p.fechaPago ?? p.fecha);

const mismoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Cobrado hoy (pagos en estado pagado cuyo cobro fue hoy). */
export function cobradoHoy(pagos: Pago[], hoy: Date): { total: number; cantidad: number } {
  const delDia = pagos.filter(p => p.estado === 'pagado' && mismoDia(fechaCobro(p), hoy));
  return { total: redondearCentavos(delDia.reduce((s, p) => s + p.total, 0)), cantidad: delDia.length };
}

export interface FilaMetodo { metodo: MetodoPago; total: number; porcentaje: number; }

/** Cobrado este mes por método de pago, de mayor a menor (porcentaje redondeado del total). */
export function cobradoPorMetodo(pagos: Pago[], hoy: Date): FilaMetodo[] {
  const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const delMes = pagos.filter(p => p.estado === 'pagado' && fechaCobro(p) >= ini && fechaCobro(p) <= hoy);
  const total = delMes.reduce((s, p) => s + p.total, 0);
  return (Object.keys(METODO_TEXTO) as MetodoPago[])
    .map(metodo => {
      const t = redondearCentavos(delMes.filter(p => p.metodoPago === metodo).reduce((s, p) => s + p.total, 0));
      return { metodo, total: t, porcentaje: total ? Math.round((t / total) * 100) : 0 };
    })
    .filter(f => f.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** "Consulta veterinaria", "Consulta veterinaria + 2 más". */
export function conceptoPago(p: Pago): string {
  if (!p.items.length) return 'Sin detalle';
  return p.items.length === 1 ? p.items[0].descripcion : `${p.items[0].descripcion} + ${p.items.length - 1} más`;
}

/** Recordatorio de cobro para WhatsApp. */
export function mensajeCobro(p: Pago, nombreCliente: string, nombreMascota: string): string {
  const nombre = nombreCliente.split(' ')[0];
  return `Hola ${nombre}, le escribimos de la clínica veterinaria: tiene un saldo pendiente de $${p.total.toFixed(2)} por la atención de ${nombreMascota}. Puede pagar por Yappy, transferencia o en la clínica. ¡Gracias!`;
}

// ---------- Nuevo cobro ----------

export const CATEGORIA_TEXTO: Record<ItemPago['categoria'], string> = {
  consulta: 'Consulta', vacuna: 'Vacuna', examen: 'Examen', medicamento: 'Medicamento', cirugia: 'Cirugía', otro: 'Otro'
};

export interface ServicioFrecuente { descripcion: string; categoria: ItemPago['categoria']; precio: number; veces: number; }

/** Servicios más cobrados (sin anulados), con el último precio usado como sugerencia. */
export function serviciosFrecuentes(pagos: Pago[], limite = 8): ServicioFrecuente[] {
  const mapa = new Map<string, ServicioFrecuente & { fecha: number }>();
  for (const p of pagos) {
    if (p.estado === 'anulado') continue;
    const fecha = new Date(p.fecha).getTime();
    for (const i of p.items) {
      const clave = i.descripcion.trim().toLowerCase();
      if (!clave) continue;
      const previo = mapa.get(clave);
      if (!previo) { mapa.set(clave, { descripcion: i.descripcion.trim(), categoria: i.categoria, precio: i.precioUnitario, veces: 1, fecha }); continue; }
      previo.veces++;
      if (fecha > previo.fecha) Object.assign(previo, { precio: i.precioUnitario, categoria: i.categoria, fecha });
    }
  }
  return [...mapa.values()]
    .sort((a, b) => b.veces - a.veces || a.descripcion.localeCompare(b.descripcion, 'es'))
    .slice(0, limite)
    .map(({ descripcion, categoria, precio, veces }) => ({ descripcion, categoria, precio, veces }));
}
