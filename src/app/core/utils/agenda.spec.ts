import { describe, expect, it } from 'vitest';
import { Cita, Cliente, Mascota } from '../models';
import { celda, citasPorConfirmar, mensajeRecordatorio, resumenDelDia, tableroDelDia, tramoDe, tramosDelDia } from './agenda';

const AHORA = new Date(2026, 9, 23, 11, 0); // viernes 23 de octubre de 2026, 11:00
const cita = (id: string, vet: string, hora: string, estado: Cita['estado'], dia = 23): Cita =>
  ({ id, clienteId: 'c', mascotaId: 'm', veterinarioId: vet, fecha: new Date(2026, 9, dia), hora, motivo: '', estado, createdAt: AHORA });

describe('agenda', () => {
  it('tramos de media hora y tramo de una hora suelta (las inmediatas llegan a cualquier minuto)', () => {
    expect(tramosDelDia(7, 8)).toEqual(['07:00', '07:30', '08:00', '08:30']);
    expect(tramoDe('11:16')).toBe('11:00');
    expect(tramoDe('11:45')).toBe('11:30');
  });

  it('tablero: agrupa por veterinario y tramo, sin canceladas ni otros días', () => {
    const t = tableroDelDia([
      cita('a', 'v1', '10:30', 'confirmada'), cita('b', 'v1', '10:40', 'inmediata'),
      cita('c', 'v1', '12:00', 'cancelada'), cita('d', 'v2', '10:30', 'pendiente', 24)
    ], AHORA);
    expect(t.get(celda('v1', '10:30'))?.map(c => c.id)).toEqual(['a', 'b']);
    expect(t.has(celda('v1', '12:00'))).toBe(false);
    expect(t.has(celda('v2', '10:30'))).toBe(false);
  });

  it('resumen del día: por confirmar, en espera, atendidas y las que no llegaron', () => {
    const r = resumenDelDia([
      cita('a', 'v', '09:00', 'pendiente'), cita('b', 'v', '14:00', 'pendiente'), cita('c', 'v', '15:00', 'confirmada'),
      cita('d', 'v', '10:50', 'inmediata'), cita('e', 'v', '08:00', 'completada'), cita('f', 'v', '16:00', 'cancelada')
    ], AHORA, AHORA);
    expect(r).toEqual({ total: 5, porConfirmar: 1, confirmadas: 1, enEspera: 1, atendidas: 1, noLlegaron: 1 });
  });

  it('por confirmar: pendientes desde ahora y dentro de 7 días, en orden', () => {
    const lista = citasPorConfirmar([
      cita('pasada', 'v', '09:00', 'pendiente'), cita('luego', 'v', '15:00', 'pendiente'), cita('lunes', 'v', '08:00', 'pendiente', 26),
      cita('lejos', 'v', '08:00', 'pendiente', 31), cita('ultimo', 'v', '20:00', 'pendiente', 30), cita('conf', 'v', '16:00', 'confirmada')
    ], AHORA);
    expect(lista.map(c => c.id)).toEqual(['luego', 'lunes', 'ultimo']);
  });

  it('el recordatorio nombra al dueño, la mascota, el día y la hora', () => {
    const texto = mensajeRecordatorio(cita('a', 'v', '10:00', 'pendiente', 26), { nombre: 'Max' } as Mascota, { nombre: 'Ana Castillo' } as Cliente);
    expect(texto).toContain('Hola Ana,');
    expect(texto).toContain('cita de Max el lunes, 26 de octubre a las 10:00');
  });
});
