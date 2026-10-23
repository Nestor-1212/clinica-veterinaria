import { describe, expect, it } from 'vitest';
import { Mascota, Vacuna } from '../models';
import { estadoRecordatorio, filasVacunas, porProximaFecha, sumarDias, textoVencimiento, ultimaDosisDe } from './vacunas';

describe('estadoRecordatorio', () => {
  const hoy = new Date(2026, 9, 21, 12, 0);

  it('una vacuna cuya próxima fecha ya pasó está vencida (no "Próxima")', () => {
    expect(estadoRecordatorio({ proximaFecha: '2026-09-16' }, hoy)).toBe('vencida');
  });

  it('una vacuna con fecha futura es próxima', () => {
    expect(estadoRecordatorio({ proximaFecha: '2026-10-26' }, hoy)).toBe('proxima');
  });

  it('ordena las pendientes con las vencidas primero', () => {
    const lista = [{ proximaFecha: '2026-10-28' }, { proximaFecha: '2026-09-16' }, { proximaFecha: '2026-10-24' }];
    expect([...lista].sort(porProximaFecha).map(v => v.proximaFecha)).toEqual(['2026-09-16', '2026-10-24', '2026-10-28']);
  });
});

describe('lista y registro de vacunas', () => {
  const HOY = new Date(2026, 9, 23, 11);
  const m = (id: string, activo = true) =>
    ({ id, clienteId: 'c', nombre: id, tipo: 'Perro', raza: '', sexo: 'macho', edad: 1, peso: 1, color: '', fechaNacimiento: HOY, activo }) as Mascota;
  const v = (id: string, mascotaId: string, nombre: string, aplicada: Date, proxima: Date): Vacuna =>
    ({ id, mascotaId, clienteId: 'c', veterinarioId: 'x', nombre, lote: 'L', fechaAplicacion: aplicada, proximaFecha: proxima });

  it('una fila por mascota activa y vacuna, con su estado y en orden de vencimiento', () => {
    const filas = filasVacunas([
      v('vieja', 'rex', 'Rabia', new Date(2024, 9, 1), new Date(2025, 9, 1)),
      v('rabia', 'rex', 'Rabia', new Date(2025, 9, 1), new Date(2026, 9, 13)),
      v('oct', 'rex', 'Óctuple Canina', new Date(2026, 0, 1), new Date(2026, 10, 2)),
      v('lepto', 'mia', 'Leptospira', new Date(2026, 5, 1), new Date(2027, 5, 1)),
      v('baja', 'ido', 'Rabia', new Date(2025, 0, 1), new Date(2025, 5, 1))
    ], [m('rex'), m('mia'), m('ido', false)], [], HOY);
    expect(filas.map(f => [f.vacuna.id, f.estado, f.dias])).toEqual([['rabia', 'vencida', -10], ['oct', 'proxima', 10], ['lepto', 'al-dia', 221]]);
  });

  it('textos de vencimiento y última dosis de la misma vacuna', () => {
    expect(textoVencimiento(-10)).toBe('vencida hace 10 días');
    expect(textoVencimiento(0)).toBe('vence hoy');
    expect(textoVencimiento(95)).toBe('en 3 meses');
    const dosis = [v('a', 'rex', 'Rabia', new Date(2024, 0, 1), HOY), v('b', 'rex', 'rabia ', new Date(2025, 0, 1), HOY)];
    expect(ultimaDosisDe(dosis, 'rex', 'Rabia')?.id).toBe('b');
    expect(ultimaDosisDe(dosis, 'rex', 'Rabia', 'b')?.id).toBe('a');
    expect(sumarDias(new Date(2026, 9, 23, 15), 365).getFullYear()).toBe(2027);
  });
});
