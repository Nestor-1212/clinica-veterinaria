export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'inmediata';

export interface Cita {
  id: string;
  clienteId: string;
  mascotaId: string;
  veterinarioId: string;
  fecha: Date | string;
  hora: string;
  motivo: string;
  estado: EstadoCita;
  notas?: string;
  /** Hora real en que el paciente con cita llegó a la clínica (pasa a la sala de espera). */
  llegada?: Date | string;
  /** Cuándo se envió el recordatorio por WhatsApp (confirmar sin él es confirmar a ciegas). */
  recordatorio?: Date | string;
  createdAt: Date | string;
}
