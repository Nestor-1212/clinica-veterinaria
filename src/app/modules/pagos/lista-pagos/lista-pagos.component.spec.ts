import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ListaPagosComponent } from './lista-pagos.component';
import { Pago } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

const PENDIENTE: Pago = {
  id: 'p1', clienteId: 'c1', mascotaId: 'm1', fecha: new Date().toISOString(),
  items: [{ descripcion: 'Consulta', categoria: 'consulta', cantidad: 1, precioUnitario: 40, subtotal: 40 }],
  subtotal: 40, descuento: 0, total: 40, metodoPago: 'yappy', estado: 'pendiente'
};

describe('ListaPagosComponent (B3)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS, vet_pagos: [PENDIENTE] });
    sesionComo('u-rec');
  });

  it('marcar pagado tras confirmar actualiza el estado y el total del mes', () => {
    const { componente } = crearComponente(ListaPagosComponent);
    componente.ngOnInit();
    expect(componente.totalMes).toBe(0);
    componente.marcarPagado(componente.dataSource.data[0]);
    expect(leer<Pago>('vet_pagos')[0].estado).toBe('pagado');
    expect(componente.totalMes).toBe(40);
  });

  it('si se cancela el diálogo no cambia nada', () => {
    const h = crearComponente(ListaPagosComponent);
    h.dialogResult(undefined);
    h.componente.ngOnInit();
    h.componente.marcarPagado(h.componente.dataSource.data[0]);
    h.componente.anular(h.componente.dataSource.data[0]);
    expect(leer<Pago>('vet_pagos')[0].estado).toBe('pendiente');
  });

  it('anular usa el motivo escrito en el diálogo y registra al usuario', () => {
    const h = crearComponente(ListaPagosComponent);
    h.dialogResult('Error de digitación');
    h.componente.ngOnInit();
    h.componente.anular(h.componente.dataSource.data[0]);
    const [p] = leer<Pago>('vet_pagos');
    expect(p.estado).toBe('anulado');
    expect(p.motivoAnulacion).toBe('Error de digitación');
    expect(p.anuladoPor).toBe('u-rec');
  });
});
