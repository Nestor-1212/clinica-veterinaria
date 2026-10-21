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
    componente.onSubmit();
    const [p] = leer<Pago>('vet_pagos');
    expect(p.subtotal).toBe(35);
    expect(p.descuento).toBe(5);
    expect(p.total).toBe(30);
    expect(p.items.map(i => i.subtotal)).toEqual([20, 15]);
  });
});
