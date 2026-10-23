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

  it('B9: la búsqueda encuentra citas por nombre de cliente, mascota y veterinario (sin tildes)', () => {
    const { componente } = crearComponente(ListaCitasComponent);
    componente.ngOnInit();
    const buscar = (texto: string) => {
      componente.dataSource.filter = texto;
      return componente.dataSource.filteredData.map(c => c.id).sort();
    };
    expect(buscar('perez')).toEqual(['cita2']);
    expect(buscar('rocky')).toEqual(['cita1']);
    expect(buscar('victor')).toEqual(['cita1', 'cita2']);
    expect(buscar('vacunación')).toEqual(['cita1']);
  });

  it('B6: si se descarta el diálogo la cita no cambia', () => {
    const h = crearComponente(ListaCitasComponent);
    h.dialogResult(false);
    h.componente.ngOnInit();
    h.componente.cancelar(h.componente.dataSource.data[0]);
    expect(leer<Cita>('vet_citas').every(c => c.estado === 'pendiente')).toBe(true);
  });

  it('el tablero ubica cada cita en su veterinario y media hora; por confirmar solo trae pendientes futuras', () => {
    const manana = new Date(); manana.setDate(manana.getDate() + 1);
    sembrar({ vet_citas: [
      cita({ id: 'p', fecha: manana, hora: '10:00', estado: 'pendiente' }),
      cita({ id: 'k', fecha: manana, hora: '10:40', estado: 'confirmada' }),
      cita({ id: 'x', fecha: manana, hora: '11:00', estado: 'cancelada' })
    ] });
    const { componente } = crearComponente(ListaCitasComponent);
    componente.ngOnInit();
    componente.irA(manana);
    const vet = componente.veterinarios[0].id;
    expect(componente.citasEn(vet, '10:00').map(c => c.id)).toEqual(['p']);
    expect(componente.citasEn(vet, '10:30').map(c => c.id)).toEqual(['k']);
    expect(componente.citasEn(vet, '11:00')).toEqual([]);
    expect(componente.puedeAgendar('11:00')).toBe(true);
    expect(componente.totalPorConfirmar).toBe(1);
    componente.cambiarEstado(componente.citasEn(vet, '10:00')[0], 'confirmada');
    expect(componente.totalPorConfirmar).toBe(0);
  });
});
