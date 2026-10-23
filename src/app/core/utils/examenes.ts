import { Examen } from '../models';

/** Exámenes frecuentes (sugerencias; se puede escribir otro). */
export const TIPOS_EXAMEN = [
  'Hemograma completo', 'Perfil bioquímico', 'Urianálisis', 'Coprológico', 'Raspado de piel', 'Citología',
  'Radiografía', 'Ecografía', 'Cultivo y antibiograma', 'Test rápido (ELISA)', 'PCR'
];

/** Un examen sin resultado está pendiente (solicitado, a la espera del laboratorio). */
export function examenPendiente(e: Pick<Examen, 'resultado'>): boolean {
  return !(e.resultado || '').trim();
}
