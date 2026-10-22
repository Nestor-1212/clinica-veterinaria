/** Edad en años con la forma correcta: "1 año", "3 años"; vacío si no hay dato. */
export function formatearEdad(edad: number | null | undefined): string {
  if (edad === null || edad === undefined || Number.isNaN(Number(edad))) return '';
  return `${edad} ${Number(edad) === 1 ? 'año' : 'años'}`;
}
