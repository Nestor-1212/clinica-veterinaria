import { describe, expect, it } from 'vitest';
import { cobradoHoy, cobradoPorMetodo, conceptoPago, descuentoValido, subtotalLineas, totalPago } from './pagos';
import { Pago } from '../models';

describe('Cálculo de pagos (B10)', () => {
  it('subtotal de las líneas redondeado a centavos', () => {
    expect(subtotalLineas([{ cantidad: 1, precioUnitario: 0.1 }, { cantidad: 1, precioUnitario: 0.2 }])).toBe(0.3);
    expect(subtotalLineas([{ cantidad: 2, precioUnitario: 12.5 }, { cantidad: null, precioUnitario: 5 }])).toBe(25);
  });

  it('el descuento no puede superar el subtotal ni ser negativo', () => {
    expect(descuentoValido(50, 50)).toBe(true);
    expect(descuentoValido(50, 0)).toBe(true);
    expect(descuentoValido(50, 60)).toBe(false);
    expect(descuentoValido(50, -1)).toBe(false);
  });

  it('total = subtotal − descuento; con descuento excesivo no se calcula', () => {
    expect(totalPago(103, 3)).toBe(100);
    expect(() => totalPago(20, 25)).toThrow();
  });
});

describe('lista de pagos', () => {
  const HOY = new Date(2026, 9, 23, 15);
  const pago = (total: number, metodoPago: Pago['metodoPago'], estado: Pago['estado'], fecha: Date, fechaPago?: Date): Pago => ({
    id: String(Math.random()), clienteId: 'c', mascotaId: 'm', fecha, fechaPago, items: [{ descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: total, subtotal: total }],
    subtotal: total, descuento: 0, total, metodoPago, estado
  });
  const pagos = [
    pago(30, 'efectivo', 'pagado', new Date(2026, 9, 23, 9)),
    pago(50, 'yappy', 'pagado', new Date(2026, 9, 2)),
    pago(20, 'yappy', 'pagado', new Date(2026, 8, 28), new Date(2026, 9, 23, 10)), // pendiente de sept cobrado hoy
    pago(99, 'tarjeta', 'pendiente', new Date(2026, 9, 23)),
    pago(10, 'tarjeta', 'anulado', new Date(2026, 9, 23))
  ];

  it('cobrado hoy cuenta por fecha de cobro y solo lo pagado', () => {
    expect(cobradoHoy(pagos, HOY)).toEqual({ total: 50, cantidad: 2 });
  });

  it('cobrado del mes por método, de mayor a menor', () => {
    expect(cobradoPorMetodo(pagos, HOY)).toEqual([
      { metodo: 'yappy', total: 70, porcentaje: 70 }, { metodo: 'efectivo', total: 30, porcentaje: 30 }
    ]);
  });

  it('concepto: primer servicio y cuántos más', () => {
    const p = pago(10, 'efectivo', 'pagado', HOY);
    expect(conceptoPago(p)).toBe('Consulta');
    expect(conceptoPago({ ...p, items: [...p.items, ...p.items] })).toBe('Consulta + 1 más');
  });
});
