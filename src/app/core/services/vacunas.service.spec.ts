import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { VacunasService, ultimasDosis } from './vacunas.service';
import { Vacuna } from '../models';
import { MASCOTAS, sembrar } from '../../../testing/fixtures';

const HOY = new Date('2026-10-21T12:00:00');
const dias = (n: number) => new Date(HOY.getTime() + n * 86_400_000).toISOString();

function vacuna(parcial: Partial<Vacuna>): Vacuna {
  return {
    id: 'v', mascotaId: 'm1', clienteId: 'c1', veterinarioId: 'u-vet', nombre: 'Rabia', lote: 'L1',
    fechaAplicacion: dias(-365), proximaFecha: dias(0), ...parcial
  };
}

describe('VacunasService.getPendientes (B5)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('una dosis vencida que ya fue reemplazada por una dosis posterior NO es pendiente', () => {
    sembrar({
      vet_mascotas: MASCOTAS,
      vet_vacunas: [
        vacuna({ id: 'vieja', fechaAplicacion: dias(-400), proximaFecha: dias(-35) }),
        vacuna({ id: 'nueva', nombre: ' rabia ', fechaAplicacion: dias(-10), proximaFecha: dias(355) })
      ]
    });
    const ids = TestBed.inject(VacunasService).getPendientes(HOY).map(v => v.id);
    expect(ids).toEqual([]);
  });

  it('la última dosis vencida o por vencer en la ventana de aviso (30 días) sí es pendiente', () => {
    sembrar({
      vet_mascotas: MASCOTAS,
      vet_vacunas: [
        vacuna({ id: 'vencida', proximaFecha: dias(-3) }),
        vacuna({ id: 'pronto', mascotaId: 'm2', proximaFecha: dias(5) }),
        vacuna({ id: 'lejos', mascotaId: 'm2', nombre: 'Triple', proximaFecha: dias(45) })
      ]
    });
    const ids = TestBed.inject(VacunasService).getPendientes(HOY).map(v => v.id).sort();
    expect(ids).toEqual(['pronto', 'vencida']);
  });

  it('excluye las vacunas de mascotas inactivas', () => {
    sembrar({
      vet_mascotas: MASCOTAS.map(m => m.id === 'm1' ? { ...m, activo: false } : m),
      vet_vacunas: [vacuna({ id: 'de-inactiva', proximaFecha: dias(-1) })]
    });
    expect(TestBed.inject(VacunasService).getPendientes(HOY)).toEqual([]);
  });

  it('ultimasDosis agrupa por mascota y nombre de vacuna', () => {
    const r = ultimasDosis([
      vacuna({ id: 'a', fechaAplicacion: dias(-100) }),
      vacuna({ id: 'b', fechaAplicacion: dias(-50) }),
      vacuna({ id: 'c', mascotaId: 'm2', fechaAplicacion: dias(-200) })
    ]);
    expect(r.map(v => v.id).sort()).toEqual(['b', 'c']);
  });
});
