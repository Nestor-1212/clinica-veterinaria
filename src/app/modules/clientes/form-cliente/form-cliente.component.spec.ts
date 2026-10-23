import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormClienteComponent } from './form-cliente.component';
import { Cliente } from '../../../core/models';
import { CLIENTES, USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
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

  it('al editar guarda y vuelve al expediente del cliente', () => {
    sembrar({ vet_clientes: CLIENTES });
    const id = CLIENTES[0].id;
    const { componente, navigate } = crearComponente(FormClienteComponent, { params: { id } });
    componente.ngOnInit();
    expect(componente.nombreOriginal).toBe(CLIENTES[0].nombre);
    componente.form.patchValue({ telefono: '6999-1234' });

    componente.onSubmit();

    expect(leer<Cliente>('vet_clientes').find(c => c.id === id)?.telefono).toBe('6999-1234');
    expect(navigate).toHaveBeenCalledWith(['/clientes', id]);
  });
});

describe('FormClienteComponent: ayudas al registrar', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES });
    sesionComo('u-rec');
  });

  it('avisa al escribir una cédula ya registrada y no deja guardar', () => {
    const { componente, navigate } = crearComponente(FormClienteComponent);
    componente.ngOnInit();
    componente.form.patchValue({ nombre: 'Otra Persona', cedula: CLIENTES[0].cedula, telefono: '6000-0000' });
    expect(componente.duplicado?.id).toBe(CLIENTES[0].id);
    expect(componente.form.get('cedula')?.hasError('duplicada')).toBe(true);
    componente.onSubmit();
    expect(navigate).not.toHaveBeenCalled();
    componente.form.patchValue({ cedula: '8-999-999' });
    expect(componente.duplicado).toBeNull();
    expect(componente.form.get('cedula')?.valid).toBe(true);
  });

  it('"Registrar y agregar mascota" guarda el teléfono con guion y abre el alta de su mascota', () => {
    const { componente, navigate } = crearComponente(FormClienteComponent);
    componente.ngOnInit();
    componente.form.patchValue({ nombre: 'Laura Ruiz', cedula: '8-123-456', telefono: '60001111' });
    componente.onSubmit(true);
    const nuevo = leer<Cliente>('vet_clientes').find(c => c.cedula === '8-123-456')!;
    expect(nuevo.telefono).toBe('6000-1111');
    expect(navigate).toHaveBeenCalledWith(['/mascotas/nueva'], { queryParams: { clienteId: nuevo.id } });
  });
});
