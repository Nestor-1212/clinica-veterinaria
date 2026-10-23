import { describe, expect, it } from 'vitest';
import { Cita, Consulta } from '../models';
import { cambioPeso, enPeriodo, evaluarTemperatura, salaDeEspera } from './consultas';

const AHORA = new Date(2026, 9, 23, 11, 0);
const cita = (id: string, hora: string, estado: Cita['estado'], vet = 'v', dia = 23): Cita =>
  ({ id, clienteId: 'c', mascotaId: 'm', veterinarioId: vet, fecha: new Date(2026, 9, dia), hora, motivo: '', estado, createdAt: AHORA });
const consulta = (dias: number): Consulta =>
  ({ id: String(dias), clienteId: 'c', mascotaId: 'm', veterinarioId: 'v', fecha: new Date(2026, 9, 23 - dias, 9), sintomas: '', temperatura: 38, peso: 1, diagnostico: '', tratamiento: '', tipo: 'cita', createdAt: AHORA });

describe('consultas', () => {
  it('evalúa la temperatura según la especie (sin rango para reptiles)', () => {
    expect(evaluarTemperatura(39.8, 'Perro')).toBe('alta');
    expect(evaluarTemperatura(38.5, 'Perro')).toBe('normal');
    expect(evaluarTemperatura(37.6, 'Gato')).toBe('baja');
    expect(evaluarTemperatura(41, 'Ave')).toBe('normal');
    expect(evaluarTemperatura(30, 'Reptil')).toBeNull();
    expect(evaluarTemperatura(null, 'Perro')).toBeNull();
  });

  it('cambio de peso con signo y un decimal', () => {
    expect(cambioPeso(12.4, 12)).toBe('+0.4 kg');
    expect(cambioPeso(10.8, 12)).toBe('−1.2 kg');
    expect(cambioPeso(12, 12)).toBe('sin cambio');
    expect(cambioPeso(null, 12)).toBeNull();
  });

  it('sala de espera: inmediatas primero, luego citas vigentes de hoy por hora; filtra por veterinario', () => {
    const citas = [
      cita('tarde', '15:00', 'confirmada'), cita('urg', '10:40', 'inmediata'), cita('temprano', '09:00', 'pendiente'),
      cita('hecha', '08:00', 'completada'), cita('otro', '12:00', 'pendiente', 'x'), cita('manana', '09:00', 'pendiente', 'v', 24)
    ];
    expect(salaDeEspera(citas, AHORA).map(c => c.id)).toEqual(['urg', 'temprano', 'otro', 'tarde']);
    expect(salaDeEspera(citas, AHORA, 'v').map(c => c.id)).toEqual(['urg', 'temprano', 'tarde']);
  });

  it('períodos hacia atrás desde hoy', () => {
    expect(enPeriodo(consulta(0), 'hoy', AHORA)).toBe(true);
    expect(enPeriodo(consulta(1), 'hoy', AHORA)).toBe(false);
    expect(enPeriodo(consulta(6), 'semana', AHORA)).toBe(true);
    expect(enPeriodo(consulta(7), 'semana', AHORA)).toBe(false);
    expect(enPeriodo(consulta(29), 'mes', AHORA)).toBe(true);
    expect(enPeriodo(consulta(400), 'todas', AHORA)).toBe(true);
  });
});
