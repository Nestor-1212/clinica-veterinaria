import { describe, expect, it } from 'vitest';
import { filtroPorTexto, normalizarTexto } from './filtro-texto';

describe('filtroPorTexto (B9)', () => {
  const filtro = filtroPorTexto<{ nombre: string; password: string }>(f => [f.nombre]);

  it('busca sin distinguir mayúsculas ni tildes', () => {
    expect(normalizarTexto('  Pérez ')).toBe('perez');
    expect(filtro({ nombre: 'Carlos Pérez', password: 'x' }, 'perez')).toBe(true);
    expect(filtro({ nombre: 'Carlos Pérez', password: 'x' }, 'PÉR')).toBe(true);
  });

  it('solo busca en los campos indicados', () => {
    expect(filtro({ nombre: 'Ana', password: 'secreto' }, 'secreto')).toBe(false);
  });

  it('un filtro vacío deja pasar todo', () => {
    expect(filtro({ nombre: 'Ana', password: '' }, '   ')).toBe(true);
  });
});
