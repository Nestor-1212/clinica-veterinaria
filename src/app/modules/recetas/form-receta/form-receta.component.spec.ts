import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormRecetaComponent } from './form-receta.component';
import { FormVacunaComponent } from '../../vacunas/form-vacuna/form-vacuna.component';
import { FormExamenComponent } from '../../examenes/form-examen/form-examen.component';
import { PdfService } from '../../../core/services/pdf.service';
import { Consulta } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

const CONSULTA: Consulta = {
  id: 'con1', clienteId: 'c1', mascotaId: 'm1', veterinarioId: 'u-vet', fecha: '2026-10-20',
  sintomas: 'Tos', temperatura: 38.5, peso: 28, diagnostico: 'Traqueítis', tratamiento: 'Jarabe', tipo: 'cita', createdAt: '2026-10-20'
};

describe('Atribución del veterinario (B7)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS, vet_consultas: [CONSULTA] });
  });

  it('el PDF de la receta lo firma el veterinario de la consulta aunque imprima el admin', async () => {
    sesionComo('u-admin');
    const { componente } = crearComponente(FormRecetaComponent, { queryParams: { consultaId: 'con1' } });
    const pdf = TestBed.inject(PdfService);
    const spy = vi.spyOn(pdf, 'generarReceta').mockResolvedValue();
    componente.ngOnInit();
    expect(componente.form.value.veterinarioId).toBe('u-vet');
    componente.items.at(0).patchValue({ medicamento: 'Jarabe', dosis: '5ml', frecuencia: 'c/12h', duracion: '5 días' });
    await componente.imprimirPDF();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][3].id).toBe('u-vet');
  });

  it('una vacuna registrada por recepción no queda a nombre de recepción: hay que elegir veterinario', () => {
    sesionComo('u-rec');
    const { componente } = crearComponente(FormVacunaComponent, { queryParams: { mascotaId: 'm1' } });
    componente.ngOnInit();
    expect(componente.form.value.veterinarioId).toBe('');
    expect(componente.form.get('veterinarioId')?.invalid).toBe(true);
    expect(componente.veterinarios.map(v => v.id)).toEqual(['u-vet']);
  });

  it('un examen registrado por un veterinario se le autoasigna', () => {
    sesionComo('u-vet');
    const { componente } = crearComponente(FormExamenComponent, { queryParams: { mascotaId: 'm1' } });
    componente.ngOnInit();
    expect(componente.form.value.veterinarioId).toBe('u-vet');
  });

  it('un examen registrado por el admin no se autoasigna al admin', () => {
    sesionComo('u-admin');
    const { componente } = crearComponente(FormExamenComponent, { queryParams: { mascotaId: 'm1' } });
    componente.ngOnInit();
    expect(componente.form.value.veterinarioId).toBe('');
  });
});
