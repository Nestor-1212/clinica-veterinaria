import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PerfilMascotaComponent } from './perfil-mascota.component';
import { CLIENTES, MASCOTAS, USUARIOS, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('PerfilMascotaComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    const dia = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    sembrar({
      vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS,
      vet_consultas: [
        { id: 'vieja', clienteId: 'c1', mascotaId: 'm1', veterinarioId: 'u-vet', fecha: dia(60), sintomas: '', temperatura: 38, peso: 28, diagnostico: 'Otitis', tratamiento: '', tipo: 'cita', createdAt: dia(60) },
        { id: 'nueva', clienteId: 'c1', mascotaId: 'm1', veterinarioId: 'u-vet', fecha: dia(2), sintomas: '', temperatura: 38, peso: 28, diagnostico: 'Control', tratamiento: '', tipo: 'cita', createdAt: dia(2) }
      ],
      vet_vacunas: [{ id: 'v', mascotaId: 'm1', clienteId: 'c1', veterinarioId: 'u-vet', nombre: 'Rabia', lote: 'L', fechaAplicacion: dia(10), proximaFecha: dia(-355) }]
    });
  });

  it('el expediente va de lo más reciente a lo más antiguo y mezcla consultas y vacunas', () => {
    sesionComo('u-vet');
    const { componente } = crearComponente(PerfilMascotaComponent, { params: { id: 'm1' } });
    componente.ngOnInit();
    expect(componente.visibles.map(e => e.consulta?.id ?? e.vacuna?.id)).toEqual(['nueva', 'v', 'vieja']);
    expect(componente.conteos).toMatchObject({ todo: 3, consulta: 2, vacuna: 1 });
  });

  it('recepción no ve acciones clínicas que no puede completar', () => {
    sesionComo('u-rec');
    const { componente } = crearComponente(PerfilMascotaComponent, { params: { id: 'm1' } });
    expect(componente.puede).toMatchObject({ consulta: false, examen: false, receta: false, cita: true, vacuna: true });
  });
});
