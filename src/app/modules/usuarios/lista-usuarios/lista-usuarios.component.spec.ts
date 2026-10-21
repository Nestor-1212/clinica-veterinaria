import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ListaUsuariosComponent } from './lista-usuarios.component';
import { ListaPagosComponent } from '../../pagos/lista-pagos/lista-pagos.component';
import { Pago } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('Búsqueda en listas (B9)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sesionComo('u-admin');
  });

  it('usuarios: no se puede buscar por contraseña, sí por nombre, correo y rol', () => {
    sembrar({ vet_usuarios: USUARIOS });
    const { componente } = crearComponente(ListaUsuariosComponent);
    componente.ngOnInit();
    componente.dataSource.filter = 'vet123';
    expect(componente.dataSource.filteredData).toHaveLength(0);
    componente.dataSource.filter = 'recepción';
    expect(componente.dataSource.filteredData.map(u => u.id)).toEqual(['u-rec']);
    componente.dataSource.filter = 'admin@test';
    expect(componente.dataSource.filteredData.map(u => u.id)).toEqual(['u-admin']);
  });

  it('pagos: busca por nombre del cliente y de la mascota', () => {
    const pago = (id: string, clienteId: string, mascotaId: string): Pago => ({
      id, clienteId, mascotaId, fecha: '2026-10-20', items: [], subtotal: 10, descuento: 0, total: 10, metodoPago: 'efectivo', estado: 'pagado'
    });
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS, vet_pagos: [pago('p1', 'c1', 'm1'), pago('p2', 'c2', 'm2')] });
    const { componente } = crearComponente(ListaPagosComponent);
    componente.ngOnInit();
    componente.dataSource.filter = 'gonzalez';
    expect(componente.dataSource.filteredData.map(p => p.id)).toEqual(['p1']);
    componente.dataSource.filter = 'luna';
    expect(componente.dataSource.filteredData.map(p => p.id)).toEqual(['p2']);
  });
});
