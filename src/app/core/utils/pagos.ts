/** Reglas de cálculo de pagos (sin impuestos: la app no los maneja todavía). */

export interface LineaCobro {
  cantidad?: number | null;
  precioUnitario?: number | null;
}

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
