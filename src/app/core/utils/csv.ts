/**
 * CSV para abrir en Excel o Google Sheets: separador coma, texto entre comillas cuando hace falta,
 * BOM para que Excel lea bien las tildes y fin de línea CRLF. Los montos van con punto decimal
 * (formato de Panamá) y sin símbolo, para poder sumarlos.
 */
export type CeldaCsv = string | number | null | undefined;

export function celdaCsv(v: CeldaCsv): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100) : v;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCsv(encabezados: string[], filas: CeldaCsv[][]): string {
  return [encabezados, ...filas].map(f => f.map(celdaCsv).join(',')).join('\r\n');
}

/** Descarga el texto como archivo .csv (con BOM). */
export function descargarCsv(nombre: string, contenido: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** "2026-10-27" para nombres de archivo. */
export function fechaArchivo(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
