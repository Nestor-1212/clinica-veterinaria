import { describe, expect, it } from 'vitest';
import { Cliente, Consulta, Mascota, Pago, Usuario } from '../models';
import { atencionesPorEspecie, comparar, diagnosticosTop, indicadores, rangoPeriodo, rendimientoVeterinarios, serviciosTop } from './reportes';

const HOY = new Date(2026, 9, 23, 15);
const pago = (total: number, fecha: Date, descripcion = 'Consulta', consultaId?: string, estado: Pago['estado'] = 'pagado'): Pago => ({
  id: String(Math.random()), clienteId: 'c', mascotaId: 'm', consultaId, fecha,
  items: [{ descripcion, categoria: 'consulta', cantidad: 1, precioUnitario: total, subtotal: total }], subtotal: total, descuento: 0, total, metodoPago: 'yappy', estado
});
const consulta = (id: string, fecha: Date, diagnostico: string, vet = 'v1', mascotaId = 'm'): Consulta => ({
  id, clienteId: 'c', mascotaId, veterinarioId: vet, fecha, sintomas: '', temperatura: 38, peso: 1, diagnostico, tratamiento: '', tipo: 'cita', createdAt: fecha
});

describe('reportes por período', () => {
  it('rangos: este mes contra el mismo tramo anterior; mes anterior completo; 90 y 365 días', () => {
    const mes = rangoPeriodo('mes', HOY);
    expect(mes.desde).toEqual(new Date(2026, 9, 1));
    expect(mes.anterior.desde).toEqual(new Date(2026, 8, 1));
    expect(mes.anterior.hasta.getDate()).toBe(23);
    const ant = rangoPeriodo('mesAnterior', HOY);
    expect([ant.desde.getMonth(), ant.hasta.getMonth(), ant.hasta.getDate()]).toEqual([8, 8, 30]);
    const tri = rangoPeriodo('trimestre', HOY);
    expect(Math.round((tri.anterior.hasta.getTime() - tri.anterior.desde.getTime()) / 86400000)).toBe(90);
  });

  it('indicadores del período y comparación', () => {
    const r = rangoPeriodo('mes', HOY);
    const pagos = [pago(40, new Date(2026, 9, 5)), pago(60, new Date(2026, 9, 20)), pago(30, new Date(2026, 8, 10)), pago(99, new Date(2026, 9, 6), 'X', undefined, 'pendiente')];
    const clientes = [{ id: 'n', fechaRegistro: new Date(2026, 9, 2) }, { id: 'v', fechaRegistro: new Date(2025, 1, 1) }] as Cliente[];
    const actual = indicadores(r, pagos, [consulta('a', new Date(2026, 9, 3), 'Otitis')], clientes, [], HOY);
    expect(actual).toEqual({ ingresos: 100, cobros: 2, ticket: 50, atenciones: 1, clientesNuevos: 1, inasistencia: 0 });
    const anterior = indicadores(r.anterior, pagos, [], clientes, [], HOY);
    expect(comparar(actual, anterior).ingresos).toEqual({ actual: 100, anterior: 30, variacion: 233 });
  });

  it('servicios, diagnósticos, especies y veterinarios del período', () => {
    const r = rangoPeriodo('mes', HOY);
    const consultas = [consulta('a', new Date(2026, 9, 3), 'Otitis', 'v1', 'perro'), consulta('b', new Date(2026, 9, 4), 'otitis ', 'v2', 'gato'), consulta('c', new Date(2026, 9, 5), 'Sano', 'v1', 'perro')];
    const pagos = [pago(40, new Date(2026, 9, 5), 'Consulta', 'a'), pago(20, new Date(2026, 9, 6), 'consulta', 'b'), pago(80, new Date(2026, 9, 6), 'Radiografía', 'a')];
    expect(serviciosTop(pagos, r).map(s => [s.servicio, s.cantidad, s.total])).toEqual([['Radiografía', 1, 80], ['Consulta', 2, 60]]);
    expect(diagnosticosTop(consultas, r).map(d => [d.nombre, d.cantidad])).toEqual([['Otitis', 2], ['Sano', 1]]);
    const mascotas = [{ id: 'perro', tipo: 'Perro' }, { id: 'gato', tipo: 'Gato' }] as Mascota[];
    expect(atencionesPorEspecie(consultas, mascotas, r).map(e => [e.nombre, e.cantidad, e.porcentaje])).toEqual([['Perro', 2, 67], ['Gato', 1, 33]]);
    const usuarios = [{ id: 'v1', nombre: 'Ana', apellido: 'R', rol: 'veterinario' }, { id: 'v2', nombre: 'Luis', apellido: 'M', rol: 'veterinario' }] as Usuario[];
    expect(rendimientoVeterinarios(usuarios, consultas, pagos, r).map(v => [v.nombre, v.atenciones, v.ingresos])).toEqual([['Ana R', 2, 120], ['Luis M', 1, 20]]);
  });
});
