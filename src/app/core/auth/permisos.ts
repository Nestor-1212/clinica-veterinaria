import { RolUsuario, Usuario } from '../models';

/** Secciones de la app protegidas por rol (coinciden con el primer segmento de la ruta). */
export type Seccion =
  | 'dashboard'
  | 'clientes'
  | 'mascotas'
  | 'citas'
  | 'consultas'
  | 'recetas'
  | 'vacunas'
  | 'examenes'
  | 'pagos'
  | 'reportes'
  | 'usuarios';

const TODOS: RolUsuario[] = ['admin', 'veterinario', 'recepcion'];

/**
 * Matriz única de permisos rol → sección.
 * La usan las rutas (roleGuard) y el sidebar; no duplicar esta información en otro sitio.
 * Nota: sin backend esto solo controla la navegación, no es una frontera de seguridad.
 */
export const PERMISOS: Readonly<Record<Seccion, readonly RolUsuario[]>> = {
  dashboard: TODOS,
  clientes: TODOS,
  mascotas: TODOS,
  citas: TODOS,
  consultas: ['admin', 'veterinario'],
  recetas: ['admin', 'veterinario'],
  vacunas: TODOS,
  examenes: ['admin', 'veterinario'],
  pagos: ['admin', 'recepcion'],
  reportes: ['admin'],
  usuarios: ['admin']
};

export function rolesDe(seccion: Seccion): RolUsuario[] {
  return [...PERMISOS[seccion]];
}

export function puedeAcceder(rol: RolUsuario | null | undefined, seccion: Seccion): boolean {
  return !!rol && PERMISOS[seccion].includes(rol);
}

export const ROL_LABELS: Readonly<Record<RolUsuario, string>> = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcion: 'Recepción'
};

/**
 * Veterinario responsable por defecto de un registro clínico:
 * solo se autoasigna si el usuario actual es veterinario (un admin o recepción no "firma").
 */
export function veterinarioPorDefecto(usuario: Pick<Usuario, 'id' | 'rol'> | null | undefined): string {
  return usuario?.rol === 'veterinario' ? usuario.id : '';
}
