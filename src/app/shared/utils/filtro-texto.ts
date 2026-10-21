/** Normaliza un texto para búsqueda: minúsculas, sin tildes y sin espacios extremos. */
export function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Crea un `filterPredicate` para MatTableDataSource que busca en los textos que devuelve
 * `campos(fila)` (p. ej. nombres resueltos de mascota y cliente en lugar de sus IDs).
 * Solo se busca en lo que se indique, así no se filtra por campos sensibles como la contraseña.
 */
export function filtroPorTexto<T>(campos: (fila: T) => unknown[]): (fila: T, filtro: string) => boolean {
  return (fila, filtro) => {
    const buscado = normalizarTexto(filtro);
    if (!buscado) return true;
    return campos(fila).some(c => normalizarTexto(c).includes(buscado));
  };
}
