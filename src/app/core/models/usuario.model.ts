export type RolUsuario = 'admin' | 'veterinario' | 'recepcion';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  rol: RolUsuario;
  telefono?: string;
  especialidad?: string;
  activo: boolean;
  createdAt: Date | string;
}
