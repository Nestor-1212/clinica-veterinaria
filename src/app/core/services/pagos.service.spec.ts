import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PagosService } from './pagos.service';
import { Pago } from '../models';
import { leer, sembrar } from '../../../testing/fixtures';

function pago(parcial: Partial<Pago>): Pago {
  return {
    id: 'p1', clienteId: 'c1', mascotaId: 'm1', fecha: new Date().toISOString(),
    items: [{ descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: 25, subtotal: 25 }],
    subtotal: 25, descuento: 0, total: 25, metodoPago: 'efectivo', estado: 'pendiente', ...parcial
  };
}

describe('PagosService: cobro y anulación (B3)', () => {
  let service: PagosService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_pagos: [pago({ id: 'p1' }), pago({ id: 'p2', estado: 'pagado' }), pago({ id: 'p3', estado: 'anulado' })] });
    service = TestBed.inject(PagosService);
  });

  it('un pago pendiente se puede marcar como pagado y cuenta en el total del mes', () => {
    expect(service.getTotalMes()).toBe(25);
    expect(service.marcarPagado('p1')).toBe(true);
    const p1 = leer<Pago>('vet_pagos').find(p => p.id === 'p1');
    expect(p1?.estado).toBe('pagado');
    expect(p1?.fechaPago).toBeTruthy();
    expect(service.getTotalMes()).toBe(50);
  });

  it('solo se cobran pagos pendientes', () => {
    expect(service.marcarPagado('p2')).toBe(false);
    expect(service.marcarPagado('p3')).toBe(false);
    expect(service.marcarPagado('no-existe')).toBe(false);
  });

  it('anular exige motivo y guarda quién y cuándo', () => {
    expect(service.anular('p1', '   ')).toBe(false);
    expect(leer<Pago>('vet_pagos')[0].estado).toBe('pendiente');
    expect(service.anular('p1', ' Cobro duplicado ', 'u-admin')).toBe(true);
    const p1 = leer<Pago>('vet_pagos')[0];
    expect(p1.estado).toBe('anulado');
    expect(p1.motivoAnulacion).toBe('Cobro duplicado');
    expect(p1.anuladoPor).toBe('u-admin');
    expect(p1.fechaAnulacion).toBeTruthy();
  });

  it('se puede anular un pago ya pagado (sale del total), pero no uno ya anulado', () => {
    expect(service.anular('p2', 'Devolución')).toBe(true);
    expect(service.getTotalMes()).toBe(0);
    expect(service.anular('p3', 'Otra vez')).toBe(false);
  });
});
