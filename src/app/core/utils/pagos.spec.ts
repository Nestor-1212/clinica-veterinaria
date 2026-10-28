import { describe, expect, it } from 'vitest';
import { atencionesPorCobrar, cierreDeCaja, lineasDeAtencion, cobradoHoy, cobradoPorMetodo, conceptoPago, descuentoValido, serviciosFrecuentes, subtotalLineas, totalPago } from './pagos';
import { Consulta, Examen, Pago } from '../models';

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

describe('serviciosFrecuentes', () => {
  const pago = (fecha: string, items: [string, number][], estado: Pago['estado'] = 'pagado'): Pago => ({
    id: fecha + items[0][0], clienteId: 'c', mascotaId: 'm', fecha, estado, metodoPago: 'efectivo', descuento: 0, subtotal: 0, total: 0,
    items: items.map(([descripcion, precio]) => ({ descripcion, categoria: 'consulta', cantidad: 1, precioUnitario: precio, subtotal: precio }))
  });

  it('ordena por veces cobrado y sugiere el último precio usado', () => {
    const r = serviciosFrecuentes([
      pago('2026-01-01', [['Consulta veterinaria', 20], ['Desparasitación', 8]]),
      pago('2026-03-01', [['Consulta veterinaria', 25]]),
      pago('2026-02-01', [['consulta veterinaria ', 22]]),
      pago('2026-03-02', [['Desparasitación', 99]], 'anulado')
    ]);
    expect(r.map(s => [s.descripcion, s.veces, s.precio])).toEqual([['Consulta veterinaria', 3, 25], ['Desparasitación', 1, 8]]);
  });
});

describe('cierreDeCaja', () => {
  const p = (id: string, total: number, metodo: Pago['metodoPago'], estado: Pago['estado'], fecha: string, extra: Partial<Pago> = {}): Pago => ({
    id, clienteId: 'c', mascotaId: 'm', fecha, items: [], subtotal: total, descuento: 0, total, metodoPago: metodo, estado, ...extra
  });
  const DIA = new Date(2026, 9, 27, 18, 0);

  it('suma por método lo cobrado ese día, incluidos pendientes cobrados hoy, y aparte anulados y pendientes', () => {
    const c = cierreDeCaja([
      p('a', 25, 'efectivo', 'pagado', '2026-10-27T09:00:00'),
      p('b', 40.5, 'yappy', 'pagado', '2026-10-27T10:00:00'),
      p('c', 30, 'efectivo', 'pagado', '2026-10-20T10:00:00', { fechaPago: '2026-10-27T11:00:00' }),
      p('d', 99, 'tarjeta', 'pagado', '2026-10-26T10:00:00'),
      p('e', 15, 'efectivo', 'anulado', '2026-10-27T08:00:00', { fechaAnulacion: '2026-10-27T12:00:00' }),
      p('f', 20, 'efectivo', 'pendiente', '2026-10-27T13:00:00')
    ], DIA);
    expect(c.cobros.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(c.porMetodo.find(m => m.metodo === 'efectivo')).toEqual({ metodo: 'efectivo', cantidad: 2, total: 55 });
    expect(c.total).toBe(95.5);
    expect(c.anulados).toEqual({ cantidad: 1, total: 15 });
    expect(c.pendientes).toEqual({ cantidad: 1, total: 20 });
  });
});

describe('de la consulta al cobro', () => {
  const consulta = (id: string, fecha: string, tipo: Consulta['tipo'] = 'cita'): Consulta => ({
    id, clienteId: 'c', mascotaId: 'm', veterinarioId: 'v', fecha, sintomas: '', temperatura: 38, peso: 5, diagnostico: '', tratamiento: '', tipo, createdAt: fecha
  });
  const pago = (consultaId: string, estado: Pago['estado']): Pago => ({
    id: 'p' + consultaId, clienteId: 'c', mascotaId: 'm', consultaId, fecha: '2026-10-28', items: [], subtotal: 0, descuento: 0, total: 0, metodoPago: 'efectivo', estado
  });

  it('lista las consultas del día sin cobro; un cobro anulado no cuenta', () => {
    const r = atencionesPorCobrar(
      [consulta('a', '2026-10-28T09:00:00'), consulta('b', '2026-10-28T10:00:00'), consulta('c', '2026-10-28T11:00:00'), consulta('ayer', '2026-10-27T11:00:00')],
      [pago('a', 'pendiente'), pago('c', 'anulado')], new Date(2026, 9, 28, 18));
    expect(r.map(c => c.id)).toEqual(['b', 'c']);
  });

  it('sugiere consulta, recargo si fue inmediata y los exámenes pedidos con su último precio', () => {
    const frecuentes = [
      { descripcion: 'Consulta veterinaria', categoria: 'consulta' as const, precio: 25, veces: 9 },
      { descripcion: 'Recargo por atención inmediata', categoria: 'consulta' as const, precio: 20, veces: 3 },
      { descripcion: 'Hemograma completo', categoria: 'examen' as const, precio: 35, veces: 2 }
    ];
    const examenes = [{ id: 'e', mascotaId: 'm', clienteId: 'c', consultaId: 'x', veterinarioId: 'v', tipo: 'Hemograma completo', descripcion: '', resultado: '', fecha: '2026-10-28' } as Examen,
      { id: 'f', mascotaId: 'm', clienteId: 'c', consultaId: 'x', veterinarioId: 'v', tipo: 'Coprológico', descripcion: '', resultado: '', fecha: '2026-10-28' } as Examen];
    expect(lineasDeAtencion(consulta('x', '2026-10-28T09:00:00', 'inmediata'), examenes, frecuentes)).toEqual([
      { descripcion: 'Consulta veterinaria', categoria: 'consulta', precio: 25 },
      { descripcion: 'Recargo por atención inmediata', categoria: 'consulta', precio: 20 },
      { descripcion: 'Hemograma completo', categoria: 'examen', precio: 35 },
      { descripcion: 'Coprológico', categoria: 'examen', precio: null }
    ]);
  });
});
