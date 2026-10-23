import { describe, expect, it } from 'vitest';
import { examenPendiente } from './examenes';
import { tamanoLegible, validarAdjunto } from '../services/archivos.service';

describe('exámenes y adjuntos', () => {
  it('un examen está pendiente sin texto de resultado ni informe adjunto', () => {
    expect(examenPendiente({ resultado: '' })).toBe(true);
    expect(examenPendiente({ resultado: '  ', archivos: [] })).toBe(true);
    expect(examenPendiente({ resultado: 'Normal' })).toBe(false);
    expect(examenPendiente({ resultado: '', archivos: [{ id: 'a', nombre: 'lab.pdf', tipo: 'application/pdf', tamano: 1, fecha: '' }] })).toBe(false);
  });

  it('acepta PDF e imágenes de hasta 10 MB', () => {
    expect(validarAdjunto({ name: 'lab.pdf', type: 'application/pdf', size: 2_000_000 })).toBeNull();
    expect(validarAdjunto({ name: 'foto.png', type: 'image/png', size: 500_000 })).toBeNull();
    expect(validarAdjunto({ name: 'datos.xlsx', type: 'application/vnd.ms-excel', size: 1000 })).toContain('no es PDF');
    expect(validarAdjunto({ name: 'grande.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 })).toContain('10 MB');
    expect(tamanoLegible(850 * 1024)).toBe('850 KB');
    expect(tamanoLegible(2.4 * 1024 * 1024)).toBe('2.4 MB');
  });
});
