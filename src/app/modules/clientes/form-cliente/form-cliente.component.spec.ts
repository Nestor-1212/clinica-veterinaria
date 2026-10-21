import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormClienteComponent } from './form-cliente.component';
import { Cliente } from '../../../core/models';
import { USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('FormClienteComponent: envío (UX Fase 4)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: [] });
    sesionComo('u-rec');
  });

  it('enviar vacío marca los campos como tocados, no guarda y no navega', () => {
    const { componente, navigate } = crearComponente(FormClienteComponent);
    componente.ngOnInit();
    expect(componente.form.get('nombre')?.touched).toBe(false);

    componente.onSubmit();

    expect(componente.form.get('nombre')?.touched).toBe(true);
    expect(componente.form.get('cedula')?.touched).toBe(true);
    expect(componente.loading).toBe(false);
    expect(leer<Cliente>('vet_clientes')).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un segundo envío mientras se guarda no duplica el cliente', () => {
    const { componente, navigate } = crearComponente(FormClienteComponent);
    componente.ngOnInit();
    componente.form.patchValue({ nombre: 'Laura Ruiz', cedula: '8-123-456', telefono: '6000-0000' });
    expect(componente.form.valid).toBe(true);

    componente.onSubmit();
    componente.onSubmit();

    expect(leer<Cliente>('vet_clientes')).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/clientes']);
  });
});
