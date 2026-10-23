import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormCitaComponent } from './form-cita.component';
import { Cita } from '../../../core/models';
import { CLIENTES, MASCOTAS, USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('FormCitaComponent: atención inmediata (B1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS, vet_clientes: CLIENTES, vet_mascotas: MASCOTAS });
  });

  function registrarInmediata() {
    const h = crearComponente(FormCitaComponent, { queryParams: { tipo: 'inmediata', clienteId: 'c1' } });
    h.componente.ngOnInit();
    h.componente.form.patchValue({ veterinarioId: 'u-vet', motivo: 'Urgencia' });
    expect(h.componente.form.valid).toBe(true);
    h.componente.onSubmit();
    return h;
  }

  it('el veterinario va a la consulta con el citaId de la cita creada', () => {
    sesionComo('u-vet');
    const { navigate } = registrarInmediata();
    const [creada] = leer<Cita>('vet_citas');
    expect(creada.estado).toBe('inmediata');
    expect(navigate).toHaveBeenCalledWith(['/consultas/nueva'], {
      queryParams: { citaId: creada.id, mascotaId: 'm1', clienteId: 'c1' }
    });
  });

  it('guarda la hora real de llegada (no un tramo de media hora) y la fija al enviar', () => {
    sesionComo('u-rec');
    const antes = new Date();
    registrarInmediata();
    const [creada] = leer<Cita>('vet_citas');
    expect(creada.hora).toMatch(/^\d{2}:\d{2}$/);
    const [h, m] = creada.hora.split(':').map(Number);
    const minutos = h * 60 + m;
    expect(Math.abs(minutos - (antes.getHours() * 60 + antes.getMinutes()))).toBeLessThanOrEqual(1);
  });

  it('desde un cliente, Volver lleva a su expediente; sin cliente, a Citas', () => {
    const conCliente = crearComponente(FormCitaComponent, { queryParams: { tipo: 'inmediata', clienteId: 'c1' } });
    conCliente.componente.ngOnInit();
    expect(conCliente.componente.volverA).toEqual(['/clientes', 'c1']);
    TestBed.resetTestingModule();
    const sinCliente = crearComponente(FormCitaComponent, { queryParams: { tipo: 'inmediata' } });
    sinCliente.componente.ngOnInit();
    expect(sinCliente.componente.volverA).toEqual(['/citas']);
  });

  it('desde la lista de Mascotas llega con la mascota elegida y Volver lleva a Mascotas', () => {
    const h = crearComponente(FormCitaComponent, { queryParams: { tipo: 'inmediata', clienteId: 'c1', mascotaId: 'm1' } });
    h.componente.ngOnInit();
    expect(h.componente.form.get('mascotaId')?.value).toBe('m1');
    expect(h.componente.volverA).toEqual(['/mascotas']);
  });

  it('recepción (sin acceso a Consultas) vuelve a Citas', () => {
    sesionComo('u-rec');
    const { navigate } = registrarInmediata();
    expect(leer<Cita>('vet_citas')).toHaveLength(1);
    expect(navigate).toHaveBeenCalledWith(['/citas']);
  });

  it('la mascota se habilita solo al elegir propietario (sin [disabled] en la plantilla)', () => {
    sesionComo('u-rec');
    const h = crearComponente(FormCitaComponent);
    h.componente.ngOnInit();
    expect(h.componente.form.get('mascotaId')?.disabled).toBe(true);
    h.componente.onClienteChange('c1');
    expect(h.componente.form.get('mascotaId')?.enabled).toBe(true);
    h.componente.onClienteChange('');
    expect(h.componente.form.get('mascotaId')?.disabled).toBe(true);
  });

  it('enviar incompleto no crea la cita y marca los errores', () => {
    sesionComo('u-rec');
    const h = crearComponente(FormCitaComponent);
    h.componente.ngOnInit();
    h.componente.onSubmit();
    expect(h.componente.form.get('clienteId')?.touched).toBe(true);
    expect(h.componente.enviando).toBe(false);
    expect(leer<Cita>('vet_citas')).toHaveLength(0);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('una cita programada vuelve a la agenda', () => {
    sesionComo('u-rec');
    const h = crearComponente(FormCitaComponent, { queryParams: { clienteId: 'c1' } });
    h.componente.ngOnInit();
    const manana = new Date(); manana.setDate(manana.getDate() + 1);
    h.componente.elegirFecha(manana);
    h.componente.form.patchValue({ veterinarioId: 'u-vet', motivo: 'Control' });
    h.componente.onSubmit();
    expect(h.navigate).not.toHaveBeenCalled(); // falta la hora
    h.componente.elegirHora({ hora: '10:00', estado: 'libre' });
    h.componente.onSubmit();
    const [cita] = leer<Cita>('vet_citas');
    expect([cita.estado, cita.hora]).toEqual(['pendiente', '10:00']);
    expect(h.navigate).toHaveBeenCalledWith(['/citas']);
  });

  it('las horas ocupadas del veterinario no se pueden elegir y al cambiar de veterinario se libera la hora', () => {
    sesionComo('u-rec');
    const manana = new Date(); manana.setDate(manana.getDate() + 1);
    sembrar({ vet_citas: [{ id: 'x', clienteId: 'c1', mascotaId: 'm1', veterinarioId: 'u-vet', fecha: manana, hora: '10:00', motivo: 'Control', estado: 'confirmada', createdAt: new Date() }] });
    const h = crearComponente(FormCitaComponent);
    h.componente.ngOnInit();
    h.componente.elegirFecha(manana);
    h.componente.form.patchValue({ veterinarioId: 'u-vet' });
    expect(h.componente.horarios.find(x => x.hora === '10:00')?.estado).toBe('ocupada');
    h.componente.elegirHora({ hora: '10:00', estado: 'ocupada' });
    expect(h.componente.form.get('hora')?.value).toBe('');
    expect(h.componente.citasPorVet['u-vet']).toBe(1);
  });
});
