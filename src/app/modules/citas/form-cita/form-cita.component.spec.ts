import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormCitaComponent } from './form-cita.component';
import { Cita } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('FormCitaComponent: atención inmediata (B1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS });
  });

  function registrarInmediata() {
    const h = crearComponente(FormCitaComponent, { queryParams: { tipo: 'inmediata', clienteId: 'c1' } });
    h.componente.ngOnInit();
    h.componente.form.patchValue({ veterinarioId: 'u-vet', motivo: 'Urgencia' });
    expect(h.componente.form.valid).toBe(true);
    h.componente.onSubmit();
    return h;
  }

  it('el veterinario va a la consulta con el citaId de la cita creada', () => {
    sesionComo('u-vet');
    const { navigate } = registrarInmediata();
    const [creada] = leer<Cita>('vet_citas');
    expect(creada.estado).toBe('inmediata');
    expect(navigate).toHaveBeenCalledWith(['/consultas/nueva'], {
      queryParams: { citaId: creada.id, mascotaId: 'm1', clienteId: 'c1' }
    });
  });

  it('recepción (sin acceso a Consultas) vuelve a Citas', () => {
    sesionComo('u-rec');
    const { navigate } = registrarInmediata();
    expect(leer<Cita>('vet_citas')).toHaveLength(1);
    expect(navigate).toHaveBeenCalledWith(['/citas']);
  });

  it('una cita programada vuelve a la agenda', () => {
    sesionComo('u-rec');
    const h = crearComponente(FormCitaComponent, { queryParams: { clienteId: 'c1' } });
    h.componente.ngOnInit();
    h.componente.form.patchValue({ veterinarioId: 'u-vet', motivo: 'Control' });
    h.componente.onSubmit();
    expect(leer<Cita>('vet_citas')[0].estado).toBe('pendiente');
    expect(h.navigate).toHaveBeenCalledWith(['/citas']);
  });
});
