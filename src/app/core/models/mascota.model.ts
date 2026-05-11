export type SexoMascota = 'macho' | 'hembra';
export type TipoMascota = 'Perro' | 'Gato' | 'Ave' | 'Conejo' | 'Reptil' | 'Otro';

export interface Mascota {
  id: string;
  clienteId: string;
  nombre: string;
  tipo: TipoMascota;
  raza: string;
  sexo: SexoMascota;
  edad: number;
  peso: number;
  color: string;
  fechaNacimiento: Date | string;
  foto?: string;
  alergias?: string;
  activo: boolean;
}
