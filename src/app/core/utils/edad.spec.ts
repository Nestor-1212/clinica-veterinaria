import { formatearEdad } from './edad';

describe('formatearEdad', () => {
  it('usa singular para 1', () => {
    expect(formatearEdad(1)).toBe('1 año');
  });

  it('usa plural para 0, decimales y varios años', () => {
    expect(formatearEdad(0)).toBe('0 años');
    expect(formatearEdad(0.5)).toBe('0.5 años');
    expect(formatearEdad(7)).toBe('7 años');
  });

  it('devuelve vacío sin dato', () => {
    expect(formatearEdad(undefined)).toBe('');
    expect(formatearEdad(null)).toBe('');
  });
});
