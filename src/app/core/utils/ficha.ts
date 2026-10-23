import { Cliente, Consulta, Mascota, Vacuna } from '../models';
import { EstadoVacunas, estadoVacunas, tiempoRelativo } from './clientes';
import { enlaceWhatsApp } from './metricas';

/** Lo que el veterinario necesita saber del paciente antes de atenderlo. */
export interface FichaPaciente {
  mascota: Mascota;
  cliente?: Cliente;
  /** Consulta más reciente hasta `hoy`. */
  ultima?: Consulta;
  ultimaHace?: string;
  vacunas: EstadoVacunas;
  whatsapp: string | null;
}

export function fichaPaciente(mascota: Mascota, cliente: Cliente | undefined, consultas: Consulta[], vacunas: Vacuna[], hoy: Date, excluirConsultaId?: string): FichaPaciente {
  const ultima = consultas
    .filter(c => c.mascotaId === mascota.id && c.id !== excluirConsultaId && new Date(c.fecha) <= hoy)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
  return {
    mascota, cliente, ultima,
    ultimaHace: ultima ? tiempoRelativo(ultima.fecha, hoy) : undefined,
    vacunas: estadoVacunas(vacunas, mascota.id, hoy),
    whatsapp: cliente ? enlaceWhatsApp(cliente.telefono, `Hola ${cliente.nombre}, le escribimos de la clínica veterinaria sobre ${mascota.nombre}.`) : null
  };
}
