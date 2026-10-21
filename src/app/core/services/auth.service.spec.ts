import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService, SESSION_KEY } from './auth.service';
import { DemoSeedService } from './demo-seed.service';
import { DEMO_MODE } from '../config/demo-mode.token';
import { Usuario } from '../models';
import { USUARIOS, leer, sembrar } from '../../../testing/fixtures';

function crear(demo = false): AuthService {
  TestBed.configureTestingModule({ providers: [{ provide: DEMO_MODE, useValue: demo }] });
  return TestBed.inject(AuthService);
}

describe('AuthService: sesión (S2/S3)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS });
  });

  it('la sesión guarda solo el id: nunca la contraseña ni el rol', () => {
    const auth = crear();
    expect(auth.login('vet@test.com', 'vet123')).toBe(true);
    const guardado = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    expect(guardado).toEqual({ id: 'u-vet' });
    expect(auth.currentUser?.password).toBe('');
  });

  it('el rol sale del almacén: manipular sessionStorage no da permisos de admin', () => {
    const auth = crear();
    auth.login('rec@test.com', 'rec123');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: 'u-rec', rol: 'admin' }));
    expect(auth.hasRole(['admin'])).toBe(false);
    expect(auth.hasRole(['recepcion'])).toBe(true);
  });

  it('un usuario desactivado pierde la sesión en la siguiente revalidación', () => {
    const auth = crear();
    auth.login('vet@test.com', 'vet123');
    expect(auth.isLoggedIn()).toBe(true);
    const usuarios = leer<Usuario>('vet_usuarios').map(u => u.id === 'u-vet' ? { ...u, activo: false } : u);
    sembrar({ vet_usuarios: usuarios });
    expect(auth.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(auth.currentUser).toBeNull();
  });

  it('un cambio de rol en el almacén se refleja sin volver a iniciar sesión', () => {
    const auth = crear();
    auth.login('vet@test.com', 'vet123');
    sembrar({ vet_usuarios: leer<Usuario>('vet_usuarios').map(u => u.id === 'u-vet' ? { ...u, rol: 'recepcion' as const } : u) });
    expect(auth.hasRole(['veterinario'])).toBe(false);
    expect(auth.hasRole(['recepcion'])).toBe(true);
  });

  it('migra una sesión antigua (usuario completo con contraseña) a { id }', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(USUARIOS[0]));
    const auth = crear();
    expect(auth.currentUser?.id).toBe('u-admin');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}')).toEqual({ id: 'u-admin' });
  });

  it('una sesión corrupta se descarta sin romper la app', () => {
    sessionStorage.setItem(SESSION_KEY, '{no-json');
    const auth = crear();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('credenciales incorrectas o usuario inactivo no inician sesión', () => {
    sembrar({ vet_usuarios: USUARIOS.map(u => u.id === 'u-rec' ? { ...u, activo: false } : u) });
    const auth = crear();
    expect(auth.login('vet@test.com', 'mala')).toBe(false);
    expect(auth.login('rec@test.com', 'rec123')).toBe(false);
  });
});

describe('Modo demo (S5)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('con demo=false no se siembran usuarios ni datos', () => {
    crear(false);
    TestBed.inject(DemoSeedService).seedIfEmpty();
    expect(leer('vet_usuarios')).toEqual([]);
    expect(leer('vet_clientes')).toEqual([]);
  });

  it('con demo=true se siembran las cuentas demo y los datos de ejemplo', () => {
    TestBed.configureTestingModule({ providers: [{ provide: DEMO_MODE, useValue: true }] });
    TestBed.inject(DemoSeedService).seedIfEmpty();
    const auth = TestBed.inject(AuthService);
    expect(leer('vet_clientes').length).toBeGreaterThan(0);
    expect(auth.login('admin@clinica.com', 'admin123')).toBe(true);
    expect(auth.login('vet@clinica.com', 'vet123')).toBe(true);
    expect(auth.login('recepcion@clinica.com', 'rec123')).toBe(true);
  });
});
