import { describe, expect, it } from 'vitest';
import { Cita, Cliente, Consulta, Mascota, Vacuna } from '../models';
import { conteoSegmentosMascotas, edadEnAnios, enSegmentoMascotas, filasMascotas, sugerirRazas } from './mascotas';

const HOY = new Date(2026, 9, 22, 12, 0);
const dias = (n: number, h = 10) => new Date(2026, 9, 22 + n, h, 0);

const cliente: Cliente = { id: 'c1', nombre: 'Ana', cedula: '', telefono: '6000-0000', correo: '', direccion: '', fechaRegistro: HOY, activo: true };
const mascota = (id: string, extra: Partial<Mascota> = {}): Mascota =>
  ({ id, clienteId: 'c1', nombre: id, tipo: 'Perro', raza: '', sexo: 'macho', edad: 1, peso: 1, color: '', fechaNacimiento: HOY, activo: true, ...extra });
const consulta = (mascotaId: string, fecha: Date, diagnostico: string): Consulta =>
  ({ id: diagnostico, clienteId: 'c1', mascotaId, veterinarioId: 'v', fecha, sintomas: '', temperatura: 38, peso: 1, diagnostico, tratamiento: '', tipo: 'cita', createdAt: fecha });
const cita = (mascotaId: string, fecha: Date, estado: Cita['estado']): Cita =>
  ({ id: Math.random().toString(36), clienteId: 'c1', mascotaId, veterinarioId: 'v', fecha, hora: `${String(fecha.getHours()).padStart(2, '0')}:00`, motivo: 'Control', estado, createdAt: fecha });
const vacuna = (mascotaId: string, proxima: Date): Vacuna =>
  ({ id: Math.random().toString(36), mascotaId, clienteId: 'c1', veterinarioId: 'v', nombre: 'Rabia', lote: 'L', fechaAplicacion: dias(-400), proximaFecha: proxima });

describe('filas de mascotas', () => {
  const filas = filasMascotas(
    [mascota('rex', { alergias: 'Penicilina' }), mascota('mia'), mascota('baja', { activo: false })],
    [cliente],
    [consulta('rex', dias(-30), 'Otitis'), consulta('rex', dias(-5), 'Control'), consulta('rex', dias(3), 'Futura')],
    [cita('mia', dias(2), 'confirmada'), cita('rex', dias(-1), 'pendiente'), cita('rex', dias(4), 'cancelada')],
    [vacuna('rex', dias(-10)), vacuna('mia', dias(60))],
    HOY
  );
  const rex = filas.find(f => f.mascota.id === 'rex')!;
  const mia = filas.find(f => f.mascota.id === 'mia')!;

  it('solo mascotas activas, con su dueño, última consulta hasta hoy y próxima cita vigente', () => {
    expect(filas.map(f => f.mascota.id)).toEqual(['rex', 'mia']);
    expect(rex.cliente?.nombre).toBe('Ana');
    expect(rex.ultimaConsulta?.diagnostico).toBe('Control');
    expect(rex.proximaCita).toBeNull();
    expect(mia.ultimaConsulta).toBeNull();
    expect(mia.proximaCita).not.toBeNull();
  });

  it('segmentos: vacunas vencidas, alergias y cita próxima', () => {
    expect(rex.vacunas.estado).toBe('vencidas');
    expect(enSegmentoMascotas(rex, 'alergias')).toBe(true);
    expect(enSegmentoMascotas(mia, 'alergias')).toBe(false);
    expect(conteoSegmentosMascotas(filas)).toEqual({ todos: 2, vacunas: 1, alergias: 1, cita: 1 });
  });
});

describe('registro de mascotas', () => {
  it('sugiere razas de la especie sin distinguir tildes', () => {
    expect(sugerirRazas('Gato', 'siames')).toEqual(['Siamés']);
    expect(sugerirRazas('Perro', '')).toContain('Mestizo');
    expect(sugerirRazas('Ave', 'labrador')).toEqual([]);
  });

  it('calcula los años cumplidos desde la fecha de nacimiento', () => {
    expect(edadEnAnios(new Date(2023, 9, 22), HOY)).toBe(3);
    expect(edadEnAnios(new Date(2023, 9, 23), HOY)).toBe(2);
    expect(edadEnAnios(new Date(2026, 5, 1), HOY)).toBe(0);
    expect(edadEnAnios(new Date(2027, 0, 1), HOY)).toBeNull();
    expect(edadEnAnios('', HOY)).toBeNull();
  });
});
