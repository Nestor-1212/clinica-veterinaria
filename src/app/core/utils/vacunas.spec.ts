import { describe, expect, it } from 'vitest';
import { estadoRecordatorio, porProximaFecha } from './vacunas';

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
