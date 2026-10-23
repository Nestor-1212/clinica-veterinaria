import { describe, expect, it } from 'vitest';
import { Cita, Cliente, Consulta, Mascota, Pago, Vacuna } from '../models';
import {
  conteoSegmentos, enSegmento, estadoVacunas, formatearTelefono, filasClientes, historialCliente, proximaCita, resumenExpediente, tiempoRelativo, ultimaVisita
} from './clientes';

const HOY = new Date(2026, 9, 22, 12, 0); // jueves 22 de octubre de 2026, 12:00
const dias = (n: number, h = 10) => new Date(2026, 9, 22 + n, h, 0);

const cliente = (id: string, registro = new Date(2025, 0, 1), activo = true): Cliente =>
  ({ id, nombre: id, cedula: '8-1-1', telefono: '6000-0000', correo: '', direccion: '', fechaRegistro: registro, activo });
const mascota = (id: string, clienteId: string, extra: Partial<Mascota> = {}): Mascota =>
  ({ id, clienteId, nombre: id, tipo: 'Perro', raza: '', sexo: 'macho', edad: 1, peso: 1, color: '', fechaNacimiento: HOY, activo: true, ...extra });
const consulta = (clienteId: string, fecha: Date, extra: Partial<Consulta> = {}): Consulta =>
  ({ id: Math.random().toString(36), clienteId, mascotaId: 'm1', veterinarioId: 'v', fecha, sintomas: '', temperatura: 38, peso: 1, diagnostico: 'Otitis', tratamiento: '', tipo: 'cita', createdAt: fecha, ...extra });
const cita = (clienteId: string, fecha: Date, estado: Cita['estado'], extra: Partial<Cita> = {}): Cita =>
  ({ id: Math.random().toString(36), clienteId, mascotaId: 'm1', veterinarioId: 'v', fecha, hora: `${String(fecha.getHours()).padStart(2, '0')}:00`, motivo: 'Control', estado, createdAt: fecha, ...extra });
const pago = (clienteId: string, total: number, estado: Pago['estado'], fecha = dias(-3)): Pago =>
  ({ id: Math.random().toString(36), clienteId, mascotaId: 'm1', fecha, items: [{ descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: total, subtotal: total }], subtotal: total, descuento: 0, total, metodoPago: 'efectivo', estado });
const vacuna = (mascotaId: string, nombre: string, aplicada: Date, proxima: Date): Vacuna =>
  ({ id: Math.random().toString(36), mascotaId, clienteId: 'c1', veterinarioId: 'v', nombre, lote: 'L', fechaAplicacion: aplicada, proximaFecha: proxima });

describe('tiempoRelativo', () => {
  it('habla en días, meses y años, hacia atrás y hacia delante', () => {
    expect(tiempoRelativo(HOY, HOY)).toBe('hoy');
    expect(tiempoRelativo(dias(-1), HOY)).toBe('ayer');
    expect(tiempoRelativo(dias(1), HOY)).toBe('mañana');
    expect(tiempoRelativo(dias(-12), HOY)).toBe('hace 12 días');
    expect(tiempoRelativo(dias(5), HOY)).toBe('en 5 días');
    expect(tiempoRelativo(dias(-40), HOY)).toBe('hace 1 mes');
    expect(tiempoRelativo(dias(-100), HOY)).toBe('hace 3 meses');
    expect(tiempoRelativo(dias(-400), HOY)).toBe('hace 1 año');
    expect(tiempoRelativo(dias(-800), HOY)).toBe('hace 2 años');
  });
});

describe('última visita y próxima cita', () => {
  it('la última visita es la consulta más reciente hasta hoy (ignora futuras)', () => {
    expect(ultimaVisita([consulta('c1', dias(-30)), consulta('c1', dias(-5)), consulta('c1', dias(2))], HOY)).toEqual(dias(-5));
    expect(ultimaVisita([], HOY)).toBeNull();
  });

  it('la próxima cita es la pendiente o confirmada más cercana desde ahora, con su hora', () => {
    const tarde = cita('c1', dias(3, 15), 'pendiente');
    const temprano = cita('c1', dias(3, 9), 'confirmada');
    const cancelada = cita('c1', dias(1), 'cancelada');
    const pasadaHoy = cita('c1', dias(0, 8), 'pendiente'); // hoy a las 8:00, ya pasó
    expect(proximaCita([tarde, temprano, cancelada, pasadaHoy], HOY)).toBe(temprano);
    expect(proximaCita([cancelada], HOY)).toBeNull();
  });
});

describe('filasClientes', () => {
  const clientes = [cliente('ana'), cliente('beto'), cliente('nuevo', dias(-10)), cliente('baja', undefined, false)];
  const mascotas = [mascota('Rocky', 'ana'), mascota('Michi', 'ana', { tipo: 'Gato' }), mascota('Viejo', 'ana', { activo: false })];
  const consultas = [consulta('ana', dias(-12)), consulta('beto', dias(-120))];
  const citas = [cita('ana', dias(4), 'confirmada')];
  const pagos = [pago('ana', 30.1, 'pendiente'), pago('ana', 14.95, 'pendiente'), pago('ana', 100, 'pagado'), pago('beto', 50, 'anulado')];
  const filas = filasClientes(clientes, mascotas, consultas, citas, pagos, HOY);
  const fila = (id: string) => filas.find(f => f.cliente.id === id)!;

  it('solo clientes activos, con mascotas activas en orden alfabético', () => {
    expect(filas.map(f => f.cliente.id)).toEqual(['ana', 'beto', 'nuevo']);
    expect(fila('ana').mascotas.map(m => `${m.nombre}:${m.tipo}`)).toEqual(['Michi:Gato', 'Rocky:Perro']);
  });

  it('calcula última visita, próxima cita y saldo pendiente (sin anulados ni pagados)', () => {
    expect(fila('ana').ultimaVisita).toEqual(dias(-12));
    expect(fila('ana').proximaCita).toBe(citas[0]);
    expect(fila('ana').saldo).toBe(45.05);
    expect(fila('beto').saldo).toBe(0);
  });

  it('marca para recuperar y nuevos con el mismo criterio que el dashboard', () => {
    expect(fila('beto').paraRecuperar).toBe(true);
    expect(fila('ana').paraRecuperar).toBe(false);
    expect(fila('nuevo').nuevo).toBe(true);
    expect(fila('nuevo').ultimaVisita).toBeNull();
  });

  it('segmentos y conteos', () => {
    expect(conteoSegmentos(filas)).toEqual({ todos: 3, saldo: 1, recuperar: 1, nuevos: 1 });
    expect(filas.filter(f => enSegmento(f, 'saldo')).map(f => f.cliente.id)).toEqual(['ana']);
    expect(filas.filter(f => enSegmento(f, 'todos'))).toHaveLength(3);
  });
});

describe('expediente', () => {
  it('resumen: total pagado, saldo y pendientes del más antiguo al más reciente', () => {
    const viejo = pago('c1', 20, 'pendiente', dias(-20));
    const reciente = pago('c1', 10, 'pendiente', dias(-1));
    const r = resumenExpediente([consulta('c1', dias(-8))], [cita('c1', dias(2), 'pendiente')], [reciente, viejo, pago('c1', 75.5, 'pagado')], HOY);
    expect(r.totalPagado).toBe(75.5);
    expect(r.saldo).toBe(30);
    expect(r.pendientes).toEqual([viejo, reciente]);
    expect(r.ultimaVisita).toEqual(dias(-8));
    expect(r.proximaCita?.estado).toBe('pendiente');
  });

  it('vacunas: al día, vencidas (según la última dosis) o sin registro', () => {
    const vacunas = [
      vacuna('m1', 'Rabia', dias(-400), dias(-35)),       // dosis vieja, ya reemplazada
      vacuna('m1', 'Rabia', dias(-30), dias(335)),
      vacuna('m1', 'Parvovirus', dias(-380), dias(-15)),  // vencida
      vacuna('m2', 'Triple felina', dias(-10), dias(355))
    ];
    expect(estadoVacunas(vacunas, 'm1', HOY)).toEqual({ estado: 'vencidas', vencidas: ['Parvovirus'] });
    expect(estadoVacunas(vacunas, 'm2', HOY)).toEqual({ estado: 'al-dia', vencidas: [] });
    expect(estadoVacunas(vacunas, 'm3', HOY)).toEqual({ estado: 'sin-registro', vencidas: [] });
  });

  it('historial unificado: ordenado, sin duplicar la cita que ya tiene consulta y marcando lo futuro', () => {
    const atendida = cita('c1', dias(-5), 'completada');
    const futura = cita('c1', dias(6), 'confirmada');
    const cancelada = cita('c1', dias(2), 'cancelada');
    const c = consulta('c1', dias(-5, 10), { citaId: atendida.id });
    const p = pago('c1', 40, 'pagado', dias(-5, 11));
    const v = vacuna('m1', 'Rabia', dias(-60), dias(305));
    const h = historialCliente([atendida, futura, cancelada], [c], [p], [v], HOY);
    expect(h.map(e => e.tipo)).toEqual(['cita', 'cita', 'pago', 'consulta', 'vacuna']);
    expect(h.find(e => e.id === atendida.id)).toBeUndefined();
    expect(h.find(e => e.id === futura.id)?.futuro).toBe(true);
    expect(h.find(e => e.id === cancelada.id)?.futuro).toBe(false);
    expect(h.find(e => e.tipo === 'pago')?.total).toBe(40);
    expect(h.find(e => e.tipo === 'vacuna')?.proximaFecha).toEqual(dias(305));
  });
});

describe('formatearTelefono', () => {
  it('pone el guion a celulares de 8 dígitos y fijos de 7; lo demás no lo toca', () => {
    expect(formatearTelefono('60001111')).toBe('6000-1111');
    expect(formatearTelefono(' 6000 1111 ')).toBe('6000-1111');
    expect(formatearTelefono('2201234')).toBe('220-1234');
    expect(formatearTelefono('+1 555 123')).toBe('+1 555 123');
  });
});
