import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ListaCitasComponent } from './lista-citas.component';
import { Cita } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, cita, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('ListaCitasComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({
      vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS,
      vet_citas: [cita({ id: 'cita1', motivo: 'Vacunación anual' }), cita({ id: 'cita2', clienteId: 'c2', mascotaId: 'm2', motivo: 'Control' })]
    });
    sesionComo('u-rec');
  });

  it('B6: cancelar NO borra la cita, la deja en estado cancelada', () => {
    const { componente } = crearComponente(ListaCitasComponent);
    componente.ngOnInit();
    componente.cancelar(componente.dataSource.data.find(c => c.id === 'cita1')!);
    const citas = leer<Cita>('vet_citas');
    expect(citas).toHaveLength(2);
    expect(citas.find(c => c.id === 'cita1')?.estado).toBe('cancelada');
  });

  it('B6: si se descarta el diálogo la cita no cambia', () => {
    const h = crearComponente(ListaCitasComponent);
    h.dialogResult(false);
    h.componente.ngOnInit();
    h.componente.cancelar(h.componente.dataSource.data[0]);
    expect(leer<Cita>('vet_citas').every(c => c.estado === 'pendiente')).toBe(true);
  });
});
