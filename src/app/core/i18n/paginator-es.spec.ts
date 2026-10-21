import { describe, expect, it } from 'vitest';
import { PaginatorEs } from './paginator-es';

describe('PaginatorEs', () => {
  const intl = new PaginatorEs();

  it('usa etiquetas en español', () => {
    expect(intl.itemsPerPageLabel).toBe('Filas por página:');
    expect(intl.firstPageLabel).toBe('Primera página');
  });

  it('formatea el rango de la página actual', () => {
    expect(intl.getRangeLabel(0, 10, 6)).toBe('1 – 6 de 6');
    expect(intl.getRangeLabel(1, 10, 25)).toBe('11 – 20 de 25');
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 de 0');
  });
});
