import { Mascota, Receta } from '../models';
import { inicioDia } from './metricas';

/**
 * Recetas: duración del tratamiento, sugerencias al recetar y alerta de alergias.
 * Funciones puras con `hoy` inyectable.
 */

export const FRECUENCIAS = ['Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Dosis única', 'Según necesidad'];
export const DURACIONES = ['3 días', '5 días', '7 días', '10 días', '14 días', '1 mes'];

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Días de un texto de duración: "7 días" → 7, "2 semanas" → 14, "1 mes" → 30; null si no se entiende. */
export function diasDuracion(texto: string): number | null {
  const m = sinTildes(texto || '').match(/(\d+)\s*(dia|semana|mes)/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === 'semana' ? n * 7 : m[2] === 'mes' ? n * 30 : n;
}

export interface EstadoTratamiento {
  enCurso: boolean;
  /** Días que faltan para terminar (0 = termina hoy); null si ya terminó o no se sabe. */
  diasRestantes: number | null;
  /** Último día de tratamiento, si las duraciones se entienden. */
  fin: Date | null;
}

/** El tratamiento dura lo que el medicamento más largo, contando el día de la receta. */
export function estadoTratamiento(receta: Receta, hoy: Date): EstadoTratamiento {
  const dias = receta.items.map(i => diasDuracion(i.duracion)).filter((d): d is number => d !== null);
  if (!dias.length) return { enCurso: false, diasRestantes: null, fin: null };
  const fin = inicioDia(new Date(receta.fecha));
  fin.setDate(fin.getDate() + Math.max(...dias) - 1);
  const restantes = Math.round((fin.getTime() - inicioDia(hoy).getTime()) / 86400000);
  return restantes >= 0 ? { enCurso: true, diasRestantes: restantes, fin } : { enCurso: false, diasRestantes: null, fin };
}

/** Medicamentos más recetados en la clínica (para sugerir al escribir). */
export function medicamentosFrecuentes(recetas: Receta[], limite = 30): string[] {
  const cuenta = new Map<string, { nombre: string; n: number }>();
  for (const r of recetas) for (const i of r.items) {
    const k = sinTildes(i.medicamento.trim());
    if (!k) continue;
    const actual = cuenta.get(k);
    cuenta.set(k, { nombre: actual?.nombre ?? i.medicamento.trim(), n: (actual?.n ?? 0) + 1 });
  }
  return [...cuenta.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es')).slice(0, limite).map(x => x.nombre);
}

/** Filtra sugerencias por texto (sin tildes ni mayúsculas). */
export function filtrarSugerencias(opciones: string[], texto: string): string[] {
  const t = sinTildes((texto || '').trim());
  return t ? opciones.filter(o => sinTildes(o).includes(t)) : opciones;
}

/**
 * ¿El medicamento menciona algo a lo que la mascota es alérgica? Compara palabras de 4+ letras
 * de las alergias registradas ("Penicilina", "sensibilidad a ciertos antibióticos").
 */
export function alergiaEnMedicamento(alergias: string | undefined, medicamento: string): string | null {
  if (!alergias?.trim() || !medicamento?.trim()) return null;
  const med = sinTildes(medicamento);
  const comunes = new Set(['alergia', 'alergica', 'alergico', 'sensibilidad', 'ciertos', 'ciertas', 'leve', 'severa']);
  // Singular para comparar ("antibioticos" → "antibiotico")
  const raiz = (p: string) => (p.length > 5 && p.endsWith('es') ? p.slice(0, -2) : p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p);
  const palabras = sinTildes(alergias).split(/[^a-zñ]+/).filter(p => p.length >= 4 && !comunes.has(p));
  for (const p of palabras) {
    const r = raiz(p);
    if (med.includes(r)) return p;
    // La familia del fármaco: alergia a "antibióticos" o "penicilina" también cubre la amoxicilina
    const familia = FAMILIAS_FARMACO.find(f => f.claves.some(k => r.startsWith(k)));
    if (familia && familia.miembros.some(m => med.includes(m))) return p;
  }
  return null;
}

/** Familias de fármacos frecuentes en la clínica: una alergia nombrada por familia cubre a sus miembros. */
const FAMILIAS_FARMACO: { claves: string[]; miembros: string[] }[] = [
  { claves: ['penicilin', 'betalactam'], miembros: ['penicilina', 'amoxicilina', 'ampicilina', 'clavulan'] },
  { claves: ['antibiotic'], miembros: ['antibiotico', 'penicilina', 'amoxicilina', 'ampicilina', 'cefalexina', 'enrofloxacina', 'doxiciclina', 'metronidazol', 'clindamicina', 'gentamicina', 'trimetoprim'] },
  { claves: ['sulfa'], miembros: ['sulfa', 'trimetoprim'] },
  { claves: ['antiinflamatori', 'aine'], miembros: ['meloxicam', 'carprofeno', 'ketoprofeno', 'firocoxib', 'antiinflamatorio'] }
];

/** Texto de la receta para enviar al dueño por WhatsApp. */
export function textoReceta(receta: Receta, mascota: Mascota | undefined, nombreDueno: string): string {
  const lineas = receta.items.map(i => `• ${i.medicamento}: ${i.dosis}, ${i.frecuencia.toLowerCase()}, durante ${i.duracion}${i.indicaciones ? ` (${i.indicaciones})` : ''}`);
  return [
    `Hola ${nombreDueno.split(' ')[0]}, le enviamos la receta de ${mascota?.nombre ?? 'su mascota'}:`,
    ...lineas,
    ...(receta.observaciones ? [`Observaciones: ${receta.observaciones}`] : []),
    'Cualquier duda, escríbanos.'
  ].join('\n');
}
