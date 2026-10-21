import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReportesComponent } from './reportes.component';
import { Vacuna } from '../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, sembrar } from '../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../testing/component-harness';

const dias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const vacuna = (id: string, proxima: string, mascotaId = 'm1'): Vacuna => ({
  id, mascotaId, clienteId: 'c1', veterinarioId: 'u-vet', nombre: 'Rabia ' + id, lote: 'L',
  fechaAplicacion: dias(-365), proximaFecha: proxima
});

describe('ReportesComponent: recordatorios de vacunas', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({
      vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS,
      vet_vacunas: [vacuna('futura', dias(5)), vacuna('vencida', dias(-30), 'm2')]
    });
    sesionComo('u-admin');
  });

  it('una vacuna con fecha pasada se etiqueta como vencida (no "Próxima") y aparece primero', () => {
    const { componente } = crearComponente(ReportesComponent);
    componente.ngOnInit();
    const [primera, segunda] = componente.vacunasPendientesList;
    expect(primera.id).toBe('vencida');
    expect(componente.estadoVacuna(primera)).toBe('vencida');
    expect(componente.estadoVacuna(segunda)).toBe('proxima');
    expect(componente.vacunasVencidas).toBe(1);
  });

  it('los gráficos tienen un texto alternativo con los valores por mes', () => {
    const { componente } = crearComponente(ReportesComponent);
    componente.ngOnInit();
    expect(componente.resumenConsultas).toMatch(/^Consultas por mes: \w+ \d+/);
    expect(componente.resumenConsultas.split(',')).toHaveLength(6);
  });
});
