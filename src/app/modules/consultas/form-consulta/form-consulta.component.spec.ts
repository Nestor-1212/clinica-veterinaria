import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormConsultaComponent } from './form-consulta.component';
import { Cita, Consulta } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, cita, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

function rellenarClinica(c: FormConsultaComponent): void {
  c.form.patchValue({ sintomas: 'Vómitos', temperatura: 38.5, peso: 28, diagnostico: 'Gastritis', tratamiento: 'Dieta' });
}

describe('FormConsultaComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS, vet_citas: [cita({ id: 'cita1', estado: 'inmediata' })] });
    sesionComo('u-vet');
  });

  it('B2: abrir el formulario con citaId NO completa la cita', () => {
    const { componente } = crearComponente(FormConsultaComponent, { queryParams: { citaId: 'cita1', mascotaId: 'm1', clienteId: 'c1' } });
    componente.ngOnInit();
    expect(leer<Cita>('vet_citas')[0].estado).toBe('inmediata');
  });

  it('B1/B2: al guardar, la consulta queda vinculada, con tipo inmediata, y la cita completada', () => {
    const { componente, navigate } = crearComponente(FormConsultaComponent, { queryParams: { citaId: 'cita1', mascotaId: 'm1', clienteId: 'c1' } });
    componente.ngOnInit();
    rellenarClinica(componente);
    expect(componente.form.valid).toBe(true);
    componente.guardarSinReceta();
    const [consulta] = leer<Consulta>('vet_consultas');
    expect(consulta.citaId).toBe('cita1');
    expect(consulta.tipo).toBe('inmediata');
    expect(consulta.veterinarioId).toBe('u-vet');
    expect(leer<Cita>('vet_citas')[0].estado).toBe('completada');
    expect(navigate).toHaveBeenCalledWith(['/consultas']);
  });

  it('una cita programada genera una consulta de tipo cita y se completa al guardar con receta', () => {
    sembrar({ vet_citas: [cita({ id: 'cita2', estado: 'confirmada' })] });
    const { componente, navigate } = crearComponente(FormConsultaComponent, { queryParams: { citaId: 'cita2', mascotaId: 'm1', clienteId: 'c1' } });
    componente.ngOnInit();
    rellenarClinica(componente);
    componente.onSubmit();
    const [consulta] = leer<Consulta>('vet_consultas');
    expect(consulta.tipo).toBe('cita');
    expect(leer<Cita>('vet_citas')[0].estado).toBe('completada');
    expect(navigate).toHaveBeenCalledWith(['/recetas/nueva'], { queryParams: { consultaId: consulta.id } });
  });
});
