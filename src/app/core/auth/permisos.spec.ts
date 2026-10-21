import { describe, expect, it } from 'vitest';
import { PERMISOS, puedeAcceder, rolesDe, veterinarioPorDefecto } from './permisos';
import { routes } from '../../app.routes';

describe('Matriz de permisos (S4)', () => {
  it('recepción no accede a consultas, recetas, laboratorio, reportes ni usuarios', () => {
    for (const s of ['consultas', 'recetas', 'examenes', 'reportes', 'usuarios'] as const) {
      expect(puedeAcceder('recepcion', s)).toBe(false);
    }
    expect(puedeAcceder('recepcion', 'pagos')).toBe(true);
  });

  it('veterinario no accede a pagos, reportes ni usuarios', () => {
    expect(puedeAcceder('veterinario', 'pagos')).toBe(false);
    expect(puedeAcceder('veterinario', 'reportes')).toBe(false);
    expect(puedeAcceder('veterinario', 'usuarios')).toBe(false);
    expect(puedeAcceder('veterinario', 'consultas')).toBe(true);
  });

  it('admin accede a todo', () => {
    for (const s of Object.keys(PERMISOS) as (keyof typeof PERMISOS)[]) {
      expect(puedeAcceder('admin', s)).toBe(true);
    }
  });

  it('sin rol no accede a nada', () => {
    expect(puedeAcceder(null, 'dashboard')).toBe(false);
  });

  it('TODAS las rutas hijas del shell usan roleGuard con los roles de la matriz', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const hijas = (shell?.children ?? []).filter(r => !r.redirectTo);
    expect(hijas.length).toBe(Object.keys(PERMISOS).length);
    for (const r of hijas) {
      expect(r.canActivate?.length, `ruta ${r.path} sin guard`).toBeGreaterThan(0);
      expect(r.data?.['roles']).toEqual(rolesDe(r.path as keyof typeof PERMISOS));
    }
  });
});

describe('veterinarioPorDefecto (B7)', () => {
  it('solo autoasigna al usuario si es veterinario', () => {
    expect(veterinarioPorDefecto({ id: 'v1', rol: 'veterinario' })).toBe('v1');
    expect(veterinarioPorDefecto({ id: 'a1', rol: 'admin' })).toBe('');
    expect(veterinarioPorDefecto({ id: 'r1', rol: 'recepcion' })).toBe('');
    expect(veterinarioPorDefecto(null)).toBe('');
  });
});
