import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormPagoComponent } from './form-pago.component';
import { Pago } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('FormPagoComponent: descuento (B10)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS });
    sesionComo('u-rec');
  });

  function formulario() {
    const h = crearComponente(FormPagoComponent, { queryParams: { clienteId: 'c1' } });
    h.componente.ngOnInit();
    h.componente.items.at(0).patchValue({ descripcion: 'Consulta', cantidad: 1, precioUnitario: 20 });
    return h;
  }

  it('un descuento mayor que el subtotal invalida el formulario y no se guarda', () => {
    const { componente, navigate } = formulario();
    componente.form.patchValue({ descuento: 25 });
    expect(componente.form.get('descuento')?.hasError('descuentoMayorQueSubtotal')).toBe(true);
    componente.onSubmit();
    expect(leer<Pago>('vet_pagos')).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('si se baja el precio por debajo del descuento ya escrito, el descuento pasa a inválido', () => {
    const { componente } = formulario();
    componente.form.patchValue({ descuento: 15 });
    expect(componente.form.get('descuento')?.valid).toBe(true);
    componente.items.at(0).patchValue({ precioUnitario: 10 });
    expect(componente.form.get('descuento')?.hasError('descuentoMayorQueSubtotal')).toBe(true);
  });

  it('con descuento válido guarda subtotal, descuento y total coherentes', () => {
    const { componente } = formulario();
    componente.agregarItem();
    componente.items.at(1).patchValue({ descripcion: 'Vacuna', categoria: 'vacuna', cantidad: 2, precioUnitario: 7.5 });
    componente.form.patchValue({ descuento: 5 });
    componente.elegirModo('cobrar');
    componente.elegirMetodo('yappy');
    componente.onSubmit();
    const [p] = leer<Pago>('vet_pagos');
    expect(p.subtotal).toBe(35);
    expect(p.descuento).toBe(5);
    expect(p.total).toBe(30);
    expect(p.items.map(i => i.subtotal)).toEqual([20, 15]);
    expect(p.estado).toBe('pagado');
    expect(p.metodoPago).toBe('yappy');
  });
});

describe('FormPagoComponent: cobrar ahora o dejar pendiente', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS });
    sesionComo('u-rec');
  });

  function formulario() {
    const h = crearComponente(FormPagoComponent, { queryParams: { clienteId: 'c1' } });
    h.componente.ngOnInit();
    h.componente.items.at(0).patchValue({ descripcion: 'Consulta', cantidad: 1, precioUnitario: 20 });
    return h;
  }

  it('desde la ficha del cliente con una sola mascota, el paciente ya queda elegido', () => {
    const { componente } = formulario();
    expect(componente.form.value.mascotaId).toBe('m1');
  });

  it('no se guarda sin elegir si se cobra ahora o queda pendiente', () => {
    const { componente } = formulario();
    componente.onSubmit();
    expect(leer<Pago>('vet_pagos')).toHaveLength(0);
    expect(componente.form.get('modo')?.hasError('required')).toBe(true);
  });

  it('cobrar ahora exige el método de pago', () => {
    const { componente } = formulario();
    componente.elegirModo('cobrar');
    componente.onSubmit();
    expect(leer<Pago>('vet_pagos')).toHaveLength(0);
    componente.elegirMetodo('efectivo');
    componente.onSubmit();
    const [p] = leer<Pago>('vet_pagos');
    expect(p.estado).toBe('pagado');
    expect(p.fechaPago).toBeTruthy();
  });

  it('dejar pendiente no pide método ni marca fecha de cobro', () => {
    const { componente } = formulario();
    componente.elegirModo('pendiente');
    componente.onSubmit();
    const [p] = leer<Pago>('vet_pagos');
    expect(p.estado).toBe('pendiente');
    expect(p.fechaPago).toBeUndefined();
  });
});
