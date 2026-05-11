export interface Examen {
  id: string;
  mascotaId: string;
  clienteId: string;
  consultaId?: string;
  veterinarioId: string;
  tipo: string;
  descripcion: string;
  resultado: string;
  fecha: Date | string;
  archivos?: string[];
}
