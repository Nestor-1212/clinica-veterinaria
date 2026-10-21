import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormUsuarioComponent } from './form-usuario.component';
import { ListaUsuariosComponent } from '../lista-usuarios/lista-usuarios.component';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models';
import { USUARIOS, leer, sembrar } from '../../../../testing/fixtures';
import { crearComponente, sesionComo } from '../../../../testing/component-harness';

describe('Edición de usuarios (B4)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    sembrar({ vet_usuarios: USUARIOS });
    sesionComo('u-admin');
  });

  it('la contraseña actual no se precarga en el formulario', () => {
    const { componente } = crearComponente(FormUsuarioComponent, { params: { id: 'u-vet' } });
    componente.ngOnInit();
    expect(componente.form.value.password).toBe('');
    expect(componente.form.valid).toBe(true);
  });

  it('guardar con la contraseña vacía conserva la contraseña y el usuario puede seguir entrando', () => {
    const { componente } = crearComponente(FormUsuarioComponent, { params: { id: 'u-vet' } });
    componente.ngOnInit();
    componente.form.patchValue({ telefono: '6000-9999' });
    componente.onSubmit();
    const vet = leer<Usuario>('vet_usuarios').find(u => u.id === 'u-vet');
    expect(vet?.password).toBe('vet123');
    expect(vet?.telefono).toBe('6000-9999');
    expect(TestBed.inject(AuthService).login('vet@test.com', 'vet123')).toBe(true);
  });

  it('si se escribe una contraseña nueva, se actualiza (mínimo 6 caracteres)', () => {
    const { componente } = crearComponente(FormUsuarioComponent, { params: { id: 'u-vet' } });
    componente.ngOnInit();
    componente.form.patchValue({ password: '123' });
    expect(componente.form.invalid).toBe(true);
    componente.form.patchValue({ password: 'nueva123' });
    componente.onSubmit();
    expect(leer<Usuario>('vet_usuarios').find(u => u.id === 'u-vet')?.password).toBe('nueva123');
  });

  it('el admin no puede desactivarse ni quitarse el rol desde el formulario', () => {
    const h = crearComponente(FormUsuarioComponent, { params: { id: 'u-admin' } });
    h.componente.ngOnInit();
    h.componente.form.patchValue({ activo: false });
    h.componente.onSubmit();
    expect(leer<Usuario>('vet_usuarios').find(u => u.id === 'u-admin')?.activo).toBe(true);
    expect(h.snack.open).toHaveBeenCalledWith('No puede desactivar su propia cuenta', 'OK', expect.anything());
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('no se puede desactivar al último administrador activo desde la lista', () => {
    // Otro admin (inactivo) intenta desactivar al único admin activo.
    sembrar({ vet_usuarios: [...USUARIOS, { ...USUARIOS[0], id: 'u-admin2', correo: 'a2@test.com', activo: false }] });
    sesionComo('u-vet');
    const h = crearComponente(ListaUsuariosComponent);
    h.componente.ngOnInit();
    h.componente.eliminar(USUARIOS[0]);
    expect(leer<Usuario>('vet_usuarios').find(u => u.id === 'u-admin')?.activo).toBe(true);
    expect(h.snack.open).toHaveBeenCalledWith('Debe quedar al menos un administrador activo', 'OK', expect.anything());
  });
});

describe('UsuariosService.validarCambio (B4)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('exige que quede al menos un admin activo', () => {
    sembrar({ vet_usuarios: USUARIOS });
    const s = TestBed.inject(UsuariosService);
    expect(s.validarCambio('u-admin', { activo: false }, 'otro')).toBe('Debe quedar al menos un administrador activo');
    expect(s.validarCambio('u-admin', { rol: 'veterinario' }, 'otro')).toBe('Debe quedar al menos un administrador activo');
    expect(s.validarCambio('u-vet', { activo: false }, 'u-admin')).toBeNull();
  });

  it('con dos admins activos se puede desactivar a uno (que no sea uno mismo)', () => {
    sembrar({ vet_usuarios: [...USUARIOS, { ...USUARIOS[0], id: 'u-admin2', correo: 'a2@test.com' }] });
    const s = TestBed.inject(UsuariosService);
    expect(s.validarCambio('u-admin2', { activo: false }, 'u-admin')).toBeNull();
    expect(s.validarCambio('u-admin', { rol: 'recepcion' }, 'u-admin')).toBe('No puede quitarse el rol de administrador');
  });
});
