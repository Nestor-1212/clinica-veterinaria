export interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  fechaRegistro: Date | string;
  activo: boolean;
}
