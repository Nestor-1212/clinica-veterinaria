import { describe, expect, it } from 'vitest';
import { Cita, Cliente, Consulta, Mascota, Pago, Vacuna } from '../models';
import {
  asistenciaMes, enlaceWhatsApp, esInasistencia, ingresosPorCategoria, ingresosPorMes, mismoMomentoMesAnterior, momentoCita, porCobrar, porCobrarHoy, recordatoriosVacuna,
  resumenClientes, resumenIngresos, siguienteDiaHabil, variacion
} from './metricas';

const HOY = new Date(2026, 9, 22, 12, 0); // jueves 22 de octubre de 2026, 12:00

const pago = (fecha: Date, total: number, estado: Pago['estado'] = 'pagado', extra: Partial<Pago> = {}): Pago => ({
  id: Math.random().toString(36), clienteId: 'c1', mascotaId: 'm1', fecha, items: [{ descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: total, subtotal: total }],
  subtotal: total, descuento: 0, total, metodoPago: 'efectivo', estado, ...extra
});
const cliente = (id: string, registro: Date): Cliente => ({ id, nombre: id, cedula: '', telefono: '6000-0000', correo: '', direccion: '', fechaRegistro: registro, activo: true });
const mascota = (id: string, clienteId: string): Mascota => ({ id, clienteId, nombre: id, tipo: 'Perro', raza: '', sexo: 'macho', edad: 1, peso: 1, color: '', fechaNacimiento: HOY, activo: true });
const consulta = (clienteId: string, fecha: Date, tipo: Consulta['tipo'] = 'cita'): Consulta => ({ id: Math.random().toString(36), clienteId, mascotaId: 'm', veterinarioId: 'v', fecha, sintomas: '', temperatura: 38, peso: 1, diagnostico: '', tratamiento: '', tipo, createdAt: fecha });
const cita = (fecha: Date, estado: Cita['estado'], clienteId = 'c1'): Cita => ({ id: Math.random().toString(36), clienteId, mascotaId: 'm', veterinarioId: 'v', fecha, hora: '10:00', motivo: '', estado, createdAt: fecha });

describe('métricas del dashboard', () => {
  it('compara el mes en curso con el mismo tramo del mes anterior, no con el mes completo', () => {
    const pagos = [
      pago(new Date(2026, 9, 5), 100), pago(new Date(2026, 9, 20), 50),          // octubre hasta el 22: 150
      pago(new Date(2026, 8, 10), 100), pago(new Date(2026, 8, 28), 400),        // septiembre: tramo 1-22 = 100, completo = 500
      pago(new Date(2026, 9, 21), 999, 'pendiente'), pago(new Date(2026, 9, 21), 999, 'anulado')
    ];
    const r = resumenIngresos(pagos, HOY);
    expect(r.mes).toBe(150);
    expect(r.mismoTramoAnterior).toBe(100);
    expect(r.variacion).toBe(50);
    expect(r.mesAnterior).toBe(500);
    expect(r.ticketPromedio).toBe(75);
  });

  it('un pendiente cobrado después cuenta en el mes en que entró el dinero', () => {
    const p = pago(new Date(2026, 8, 25), 80, 'pagado', { fechaPago: new Date(2026, 9, 2) });
    expect(resumenIngresos([p], HOY).mes).toBe(80);
  });

  it('variación sin base para comparar es null', () => {
    expect(variacion(100, 0)).toBeNull();
    expect(variacion(80, 100)).toBe(-20);
  });

  it('ingresos de 6 meses terminan en el mes en curso marcado como parcial', () => {
    const puntos = ingresosPorMes([pago(new Date(2026, 4, 3), 30)], HOY);
    expect(puntos.map(p => p.etiqueta)).toEqual(['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']);
    expect(puntos[0].total).toBe(30);
    expect(puntos.at(-1)?.enCurso).toBe(true);
    expect(puntos.filter(p => p.enCurso)).toHaveLength(1);
  });

  it('agrupa lo facturado del mes por categoría con porcentajes', () => {
    const p = pago(new Date(2026, 9, 10), 100);
    p.items = [
      { descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: 25, subtotal: 25 },
      { descripcion: 'Vacuna', categoria: 'vacuna', cantidad: 1, precioUnitario: 75, subtotal: 75 }
    ];
    const filas = ingresosPorCategoria([p], HOY);
    expect(filas[0]).toMatchObject({ etiqueta: 'Vacunas', total: 75, porcentaje: 75 });
    expect(filas[1]).toMatchObject({ etiqueta: 'Consultas', total: 25, porcentaje: 25 });
  });

  it('reparte lo pendiente por antigüedad', () => {
    const r = porCobrar([
      pago(new Date(2026, 9, 20), 10, 'pendiente'),
      pago(new Date(2026, 9, 1), 20, 'pendiente'),
      pago(new Date(2026, 7, 30), 30, 'pendiente'),
      pago(new Date(2026, 9, 20), 99, 'pagado')
    ], HOY);
    expect(r.total).toBe(60);
    expect(r.tramos.map(t => t.total)).toEqual([10, 20, 30]);
    expect(r.tramos[2].atrasado).toBe(true);
    expect(r.pendientes[0].total).toBe(30);
  });

  it('asistencia del mes solo cuenta citas ya pasadas', () => {
    const a = asistenciaMes([
      cita(new Date(2026, 9, 3), 'completada'), cita(new Date(2026, 9, 4), 'completada'),
      cita(new Date(2026, 9, 6), 'cancelada'), cita(new Date(2026, 9, 25), 'pendiente')
    ], [consulta('c1', new Date(2026, 9, 4), 'inmediata')], HOY);
    expect(a).toMatchObject({ programadas: 3, atendidas: 2, canceladas: 1, tasaCancelacion: 33, inmediatas: 1 });
  });

  it('cuenta como "no asistió" la cita pasada que sigue pendiente o confirmada, usando su hora real', () => {
    const conHora = (dia: number, hora: string, estado: Cita['estado']) => ({ ...cita(new Date(2026, 9, dia), estado), hora });
    const a = asistenciaMes([
      conHora(3, '09:00', 'completada'),
      conHora(5, '10:00', 'confirmada'),   // pasada sin atender: no llegó
      conHora(22, '11:30', 'pendiente'),   // hoy a las 11:30, ya pasó (son las 12:00): no llegó
      conHora(22, '16:00', 'confirmada')   // hoy más tarde: aún no cuenta
    ], [], HOY);
    expect(a.programadas).toBe(3);
    expect(a.noAsistieron).toBe(2);
    expect(a.tasaInasistencia).toBe(67);
    expect(esInasistencia(conHora(22, '16:00', 'confirmada'), HOY)).toBe(false);
    expect(momentoCita({ fecha: new Date(2026, 9, 22), hora: '16:30' }).getHours()).toBe(16);
  });

  it('el tramo anterior se corta a la misma hora del mismo día del mes anterior', () => {
    const corte = mismoMomentoMesAnterior(HOY);
    expect([corte.getMonth(), corte.getDate(), corte.getHours()]).toEqual([8, 22, 12]);
    // 31 de marzo se compara con el último día de febrero
    expect(mismoMomentoMesAnterior(new Date(2026, 2, 31, 9)).getDate()).toBe(28);
    const r = resumenIngresos([pago(new Date(2026, 8, 22, 11), 40), pago(new Date(2026, 8, 22, 18), 999)], HOY);
    expect(r.mismoTramoAnterior).toBe(40);
  });

  it('por cobrar hoy: solo las atenciones de hoy con pago pendiente', () => {
    const lista = porCobrarHoy([
      pago(new Date(2026, 9, 22, 9), 30, 'pendiente'), pago(new Date(2026, 9, 21, 9), 50, 'pendiente'), pago(new Date(2026, 9, 22, 10), 70)
    ], HOY);
    expect(lista.map(p => p.total)).toEqual([30]);
  });

  it('detecta clientes que no vuelven hace más de 90 días y sin cita futura', () => {
    const clientes = [cliente('viejo', new Date(2025, 0, 1)), cliente('agendado', new Date(2025, 0, 1)), cliente('nuevo', new Date(2026, 9, 3))];
    const consultas = [consulta('viejo', new Date(2026, 4, 1)), consulta('agendado', new Date(2026, 4, 1)), consulta('nuevo', new Date(2026, 9, 3))];
    const citas = [cita(new Date(2026, 9, 30), 'pendiente', 'agendado')];
    const r = resumenClientes(clientes, [mascota('m1', 'viejo')], consultas, citas, HOY);
    expect(r.sinVolver.map(s => s.cliente.id)).toEqual(['viejo']);
    expect(r.sinVolver[0].mascotas).toEqual(['m1']);
    expect(r.nuevosMes).toBe(1);
    expect(r.activos).toBe(1);
  });

  it('recordatorios de vacuna: última dosis, vencidas primero, dentro del horizonte', () => {
    const v = (id: string, aplicada: Date, proxima: Date): Vacuna => ({ id, mascotaId: 'm1', clienteId: 'c1', veterinarioId: 'v', nombre: 'Rabia', lote: '', fechaAplicacion: aplicada, proximaFecha: proxima });
    const r = recordatoriosVacuna(
      [v('vieja', new Date(2025, 9, 1), new Date(2026, 9, 1)), v('otra', new Date(2025, 9, 15), new Date(2026, 9, 12))],
      [mascota('m1', 'c1')], [cliente('c1', new Date(2025, 0, 1))], HOY
    );
    expect(r).toHaveLength(1);
    expect(r[0].vacuna.id).toBe('otra');
    expect(r[0].dias).toBe(-10);
  });

  it('el siguiente día hábil salta el domingo', () => {
    expect(siguienteDiaHabil(new Date(2026, 9, 24)).getDay()).toBe(1); // sábado → lunes
    expect(siguienteDiaHabil(HOY).getDate()).toBe(23);
  });

  it('arma el enlace de WhatsApp con el prefijo de Panamá', () => {
    expect(enlaceWhatsApp('6000-1111', 'Hola')).toBe('https://wa.me/50760001111?text=Hola');
    expect(enlaceWhatsApp('', 'x')).toBeNull();
  });
});
