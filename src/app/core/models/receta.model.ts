export interface ItemReceta {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones?: string;
}

export interface Receta {
  id: string;
  consultaId: string;
  mascotaId: string;
  clienteId: string;
  veterinarioId: string;
  fecha: Date | string;
  items: ItemReceta[];
  observaciones?: string;
}
