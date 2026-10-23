import { describe, expect, it } from 'vitest';
import { Mascota, Receta } from '../models';
import { alergiaEnMedicamento, diasDuracion, estadoTratamiento, filtrarSugerencias, medicamentosFrecuentes, textoReceta } from './recetas';

const HOY = new Date(2026, 9, 23, 11, 0);
const receta = (dia: number, duraciones: string[], meds = duraciones.map((_, i) => `Med ${i}`)): Receta => ({
  id: 'r', consultaId: 'c', mascotaId: 'm', clienteId: 'cl', veterinarioId: 'v', fecha: new Date(2026, 9, dia),
  items: duraciones.map((d, i) => ({ medicamento: meds[i], dosis: '5 ml', frecuencia: 'Cada 12 horas', duracion: d }))
});

describe('recetas', () => {
  it('entiende duraciones en días, semanas y meses', () => {
    expect(diasDuracion('7 días')).toBe(7);
    expect(diasDuracion('2 semanas')).toBe(14);
    expect(diasDuracion('1 mes')).toBe(30);
    expect(diasDuracion('hasta nuevo aviso')).toBeNull();
  });

  it('el tratamiento sigue en curso hasta el último día del medicamento más largo', () => {
    expect(estadoTratamiento(receta(20, ['3 días', '7 días']), HOY)).toMatchObject({ enCurso: true, diasRestantes: 3 });
    expect(estadoTratamiento(receta(20, ['4 días']), HOY)).toMatchObject({ enCurso: true, diasRestantes: 0 });
    expect(estadoTratamiento(receta(20, ['3 días']), HOY).enCurso).toBe(false);
    expect(estadoTratamiento(receta(20, ['según evolución']), HOY)).toEqual({ enCurso: false, diasRestantes: null, fin: null });
  });

  it('sugiere los medicamentos más usados y filtra sin tildes', () => {
    const lista = medicamentosFrecuentes([
      receta(1, ['5 días', '5 días'], ['Amoxicilina', 'Meloxicam']), receta(2, ['5 días'], ['amoxicilina']), receta(3, ['5 días'], ['Prednisona'])
    ]);
    expect(lista).toEqual(['Amoxicilina', 'Meloxicam', 'Prednisona']);
    expect(filtrarSugerencias(['Cada 12 horas', 'Dosis única'], 'unica')).toEqual(['Dosis única']);
  });

  it('detecta un medicamento que coincide con una alergia registrada', () => {
    expect(alergiaEnMedicamento('Alergia a la penicilina', 'Penicilina benzatínica')).toBe('penicilina');
    expect(alergiaEnMedicamento('Alergia al pollo', 'Amoxicilina')).toBeNull();
    expect(alergiaEnMedicamento('Sensibilidad a ciertos antibióticos', 'Antibióticos de amplio espectro')).toBe('antibioticos');
    expect(alergiaEnMedicamento(undefined, 'Amoxicilina')).toBeNull();
  });

  it('arma el texto de WhatsApp con cada medicamento', () => {
    const t = textoReceta(receta(20, ['7 días'], ['Amoxicilina']), { nombre: 'Max' } as Mascota, 'Ana Castillo');
    expect(t).toContain('Hola Ana, le enviamos la receta de Max:');
    expect(t).toContain('• Amoxicilina: 5 ml, cada 12 horas, durante 7 días');
  });
});
