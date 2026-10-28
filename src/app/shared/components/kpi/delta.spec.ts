import { describe, expect, it } from 'vitest';
import { deltaDe } from './delta';

describe('deltaDe', () => {
  it('montos: porcentaje; sin base anterior no hay comparación', () => {
    expect(deltaDe(4580, 5813, 'monto', 'vs. 1–27 sept')).toMatchObject({ porcentaje: -21 });
    expect(deltaDe(100, 0, 'monto', 'vs. 1–27 sept')).toBeNull();
  });

  it('conteos con base pequeña: diferencia absoluta, no "+400 %"', () => {
    expect(deltaDe(5, 1, 'conteo', 'vs. 1–27 sept')).toEqual({ porcentaje: 4, unidad: 'cantidad', contra: 'vs. 1 en 1–27 sept', subirEsBueno: true });
    expect(deltaDe(0, 0, 'conteo', 'vs. 1–27 sept')).toBeNull();
    expect(deltaDe(125, 133, 'conteo', 'vs. 1–27 sept')).toMatchObject({ porcentaje: -6 });
  });

  it('tasas: puntos porcentuales', () => {
    expect(deltaDe(4, 3, 'tasa', 'vs. sept', false)).toEqual({ porcentaje: 1, unidad: 'puntos', contra: 'vs. sept', subirEsBueno: false });
  });
});

describe('deltaDe sin período', () => {
  it('con base pequeña y sin período muestra solo la base', () => {
    expect(deltaDe(5, 1, 'conteo', '')?.contra).toBe('vs. 1');
  });
});
