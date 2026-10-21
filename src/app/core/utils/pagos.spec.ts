import { describe, expect, it } from 'vitest';
import { descuentoValido, subtotalLineas, totalPago } from './pagos';

describe('Cálculo de pagos (B10)', () => {
  it('subtotal de las líneas redondeado a centavos', () => {
    expect(subtotalLineas([{ cantidad: 1, precioUnitario: 0.1 }, { cantidad: 1, precioUnitario: 0.2 }])).toBe(0.3);
    expect(subtotalLineas([{ cantidad: 2, precioUnitario: 12.5 }, { cantidad: null, precioUnitario: 5 }])).toBe(25);
  });

  it('el descuento no puede superar el subtotal ni ser negativo', () => {
    expect(descuentoValido(50, 50)).toBe(true);
    expect(descuentoValido(50, 0)).toBe(true);
    expect(descuentoValido(50, 60)).toBe(false);
    expect(descuentoValido(50, -1)).toBe(false);
  });

  it('total = subtotal − descuento; con descuento excesivo no se calcula', () => {
    expect(totalPago(103, 3)).toBe(100);
    expect(() => totalPago(20, 25)).toThrow();
  });
});
