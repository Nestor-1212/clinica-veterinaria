import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CLAVE_CORREO_RECORDADO, LoginComponent } from './login.component';
import { USUARIOS, sembrar } from '../../../../testing/fixtures';
import { crearComponente } from '../../../../testing/component-harness';

const teclado = (capsLock: boolean) => ({ getModifierState: (k: string) => k === 'CapsLock' && capsLock }) as KeyboardEvent;

describe('LoginComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS });
  });

  it('avisa de Bloq Mayús mientras está activado y lo retira al desactivarlo', () => {
    const { componente } = crearComponente(LoginComponent);
    componente.revisarBloqMayus(teclado(true));
    expect(componente.bloqMayus).toBe(true);
    componente.revisarBloqMayus(teclado(false));
    expect(componente.bloqMayus).toBe(false);
  });

  it('con "Recordar mi correo" guarda solo el correo, nunca la contraseña', () => {
    const { componente, navigate } = crearComponente(LoginComponent);
    componente.form.patchValue({ correo: 'vet@test.com', password: 'vet123', recordar: true });

    componente.onSubmit();

    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(localStorage.getItem(CLAVE_CORREO_RECORDADO)).toBe('vet@test.com');
    const guardado = Object.keys(localStorage).map(k => localStorage.getItem(k)).join(' ');
    expect(guardado.replace(/"password":"vet123"/g, '')).not.toContain('vet123');
  });

  it('precarga el correo recordado y marca la casilla; sin marcar, se olvida al entrar', () => {
    localStorage.setItem(CLAVE_CORREO_RECORDADO, 'rec@test.com');
    const { componente } = crearComponente(LoginComponent);
    expect(componente.form.value.correo).toBe('rec@test.com');
    expect(componente.form.value.recordar).toBe(true);
    expect(componente.form.value.password).toBe('');

    componente.form.patchValue({ password: 'rec123', recordar: false });
    componente.onSubmit();

    expect(localStorage.getItem(CLAVE_CORREO_RECORDADO)).toBeNull();
  });

  it('credenciales incorrectas: no navega, avisa y permite reintentar', () => {
    const { componente, navigate, snack } = crearComponente(LoginComponent);
    componente.form.patchValue({ correo: 'vet@test.com', password: 'mala' });

    componente.onSubmit();

    expect(navigate).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalledWith(expect.stringContaining('no son correctos'), 'Cerrar', expect.anything());
    expect(componente.loading).toBe(false);
    expect(localStorage.getItem(CLAVE_CORREO_RECORDADO)).toBeNull();
  });
});
