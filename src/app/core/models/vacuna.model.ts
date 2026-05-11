export interface Vacuna {
  id: string;
  mascotaId: string;
  clienteId: string;
  veterinarioId: string;
  nombre: string;
  lote: string;
  fechaAplicacion: Date | string;
  proximaFecha: Date | string;
  laboratorio?: string;
  observaciones?: string;
}
