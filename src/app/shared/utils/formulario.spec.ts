import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { habilitarSi, validarYEnfocar } from './formulario';

describe('validarYEnfocar', () => {
  it('con formulario válido devuelve true y no toca los controles', () => {
    const form = new FormGroup({ nombre: new FormControl('Ana', Validators.required) });
    expect(validarYEnfocar(form, null)).toBe(true);
    expect(form.touched).toBe(false);
  });

  it('con formulario inválido marca todo como tocado y enfoca el primer campo inválido', () => {
    const form = new FormGroup({
      nombre: new FormControl('', Validators.required),
      correo: new FormControl('', Validators.required)
    });
    const raiz = document.createElement('form');
    raiz.innerHTML = `
      <input formcontrolname="ok" class="ng-valid">
      <input formcontrolname="nombre" class="ng-invalid">
      <input formcontrolname="correo" class="ng-invalid">`;
    document.body.appendChild(raiz);

    expect(validarYEnfocar(form, raiz)).toBe(false);
    expect(form.get('nombre')?.touched).toBe(true);
    expect(form.get('correo')?.touched).toBe(true);
    expect(document.activeElement?.getAttribute('formcontrolname')).toBe('nombre');
    raiz.remove();
  });
});

describe('habilitarSi', () => {
  it('habilita y deshabilita el control según la condición', () => {
    const c = new FormControl({ value: '', disabled: true });
    habilitarSi(c, true);
    expect(c.enabled).toBe(true);
    habilitarSi(c, false);
    expect(c.disabled).toBe(true);
  });
});
