export interface Consulta {
  id: string;
  clienteId: string;
  mascotaId: string;
  veterinarioId: string;
  citaId?: string;
  fecha: Date | string;
  sintomas: string;
  temperatura: number;
  peso: number;
  diagnostico: string;
  tratamiento: string;
  observaciones?: string;
  tipo: 'cita' | 'inmediata';
  createdAt: Date | string;
}
