import { describe, expect, it } from 'vitest';
import { aCsv, celdaCsv } from './csv';

describe('csv', () => {
  it('pone entre comillas lo que lleva comas, comillas o saltos, y redondea montos', () => {
    expect(celdaCsv('Consulta, vacuna')).toBe('"Consulta, vacuna"');
    expect(celdaCsv('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(celdaCsv(0.1 + 0.2)).toBe('0.3');
    expect(celdaCsv(undefined)).toBe('');
  });

  it('une filas con CRLF', () => {
    expect(aCsv(['A', 'B'], [[1, 'x'], [2, 'y,z']])).toBe('A,B\r\n1,x\r\n2,"y,z"');
  });
});
