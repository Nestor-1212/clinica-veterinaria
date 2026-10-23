import { describe, expect, it } from 'vitest';
import { Cita, Usuario } from '../models';
import { agregarMotivo, citasDelDia, disponibilidadVeterinarios, horariosDelDia } from './atencion';

const AHORA = new Date(2026, 9, 23, 11, 0);
const vet = (id: string): Usuario => ({ id, nombre: id, apellido: 'X', correo: '', password: '', rol: 'veterinario', activo: true, createdAt: AHORA });
const cita = (vetId: string, hora: string, estado: Cita['estado'], dia = 23): Cita => ({
  id: Math.random().toString(36), clienteId: 'c', mascotaId: 'm', veterinarioId: vetId, fecha: new Date(2026, 9, dia), hora, motivo: '', estado, createdAt: AHORA
});

describe('atención inmediata', () => {
  it('agrega motivos sin repetirlos', () => {
    expect(agregarMotivo('', 'Vómitos')).toBe('Vómitos');
    expect(agregarMotivo('Vómitos', 'Diarrea')).toBe('Vómitos, Diarrea');
    expect(agregarMotivo('vómitos, diarrea', 'Vómitos')).toBe('vómitos, diarrea');
  });

  it('libre si no tiene cita en ±30 min; ocupado si tiene una por empezar o en curso', () => {
    const [primero, segundo, tercero] = disponibilidadVeterinarios(
      [vet('ocupado'), vet('tarde'), vet('nada')],
      [
        cita('ocupado', '11:15', 'confirmada'),
        cita('tarde', '14:00', 'pendiente'),
        cita('tarde', '09:00', 'completada'),
        cita('nada', '11:10', 'confirmada', 24) // otro día: no cuenta
      ],
      AHORA
    );
    expect([primero.vet.id, primero.libre, primero.detalle]).toEqual(['tarde', true, 'Sin citas hasta las 14:00']);
    expect([segundo.vet.id, segundo.detalle]).toEqual(['nada', 'Sin más citas hoy']);
    expect([tercero.vet.id, tercero.libre, tercero.detalle]).toEqual(['ocupado', false, 'Tiene cita a las 11:15']);
  });

  it('una cita que empezó hace menos de 30 min sigue ocupando; las inmediatas en espera se cuentan', () => {
    const [d] = disponibilidadVeterinarios([vet('v')], [cita('v', '10:45', 'confirmada'), cita('v', '10:50', 'inmediata')], AHORA);
    expect(d.libre).toBe(false);
    expect(d.enEspera).toBe(1);
  });
});

describe('horarios de una cita programada', () => {
  const horas = ['09:00', '10:30', '11:00', '14:00'];

  it('marca las horas ocupadas del veterinario y las ya pasadas de hoy', () => {
    const citas = [cita('v', '14:00', 'confirmada'), cita('v', '11:00', 'cancelada'), cita('otro', '11:00', 'pendiente')];
    expect(horariosDelDia(horas, citas, 'v', AHORA, AHORA).map(h => h.estado)).toEqual(['pasada', 'pasada', 'pasada', 'ocupada']);
    const manana = new Date(2026, 9, 24);
    expect(horariosDelDia(horas, [cita('v', '10:30', 'pendiente', 24)], 'v', manana, AHORA).map(h => h.estado))
      .toEqual(['libre', 'ocupada', 'libre', 'libre']);
  });

  it('sin veterinario elegido solo descarta las pasadas; cuenta las citas vigentes del día', () => {
    expect(horariosDelDia(horas, [cita('v', '14:00', 'confirmada')], '', AHORA, AHORA).map(h => h.estado)).toEqual(['pasada', 'pasada', 'pasada', 'libre']);
    expect(citasDelDia([cita('v', '14:00', 'confirmada'), cita('v', '09:00', 'completada'), cita('v', '15:00', 'pendiente', 24)], 'v', AHORA)).toHaveLength(1);
  });
});
