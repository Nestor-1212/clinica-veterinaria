import { Cita, Cliente, Mascota, Usuario } from '../app/core/models';

/** Datos mínimos para pruebas unitarias; se escriben directamente en localStorage. */
export const USUARIOS: Usuario[] = [
  { id: 'u-admin', nombre: 'Ana', apellido: 'Admin', correo: 'admin@test.com', password: 'admin123', rol: 'admin', activo: true, createdAt: '2026-01-01' },
  { id: 'u-vet', nombre: 'Victor', apellido: 'Vet', correo: 'vet@test.com', password: 'vet123', rol: 'veterinario', activo: true, createdAt: '2026-01-01' },
  { id: 'u-rec', nombre: 'Rita', apellido: 'Recepcion', correo: 'rec@test.com', password: 'rec123', rol: 'recepcion', activo: true, createdAt: '2026-01-01' }
];

export const CLIENTES: Cliente[] = [
  { id: 'c1', nombre: 'María González', cedula: '8-1-1', telefono: '6000-1111', correo: 'm@test.com', direccion: '', fechaRegistro: '2026-01-01', activo: true },
  { id: 'c2', nombre: 'Carlos Pérez', cedula: '8-2-2', telefono: '6000-2222', correo: 'c@test.com', direccion: '', fechaRegistro: '2026-01-01', activo: true }
];

export const MASCOTAS: Mascota[] = [
  { id: 'm1', clienteId: 'c1', nombre: 'Rocky', tipo: 'Perro', raza: 'Labrador', sexo: 'macho', edad: 3, peso: 28, color: 'Dorado', fechaNacimiento: '2023-01-01', activo: true },
  { id: 'm2', clienteId: 'c2', nombre: 'Luna', tipo: 'Gato', raza: 'Siamés', sexo: 'hembra', edad: 2, peso: 4, color: 'Blanco', fechaNacimiento: '2024-01-01', activo: true }
];

export function cita(parcial: Partial<Cita> = {}): Cita {
  return {
    id: 'cita1', clienteId: 'c1', mascotaId: 'm1', veterinarioId: 'u-vet',
    fecha: new Date().toISOString(), hora: '09:00', motivo: 'Control', estado: 'pendiente',
    createdAt: new Date().toISOString(), ...parcial
  };
}

export function sembrar(datos: Record<string, unknown[]>): void {
  for (const [k, v] of Object.entries(datos)) localStorage.setItem(k, JSON.stringify(v));
}

export function leer<T>(clave: string): T[] {
  return JSON.parse(localStorage.getItem(clave) || '[]') as T[];
}
