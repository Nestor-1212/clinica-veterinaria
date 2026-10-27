import { describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatInput } from '@angular/material/input';
import { ResumenErroresComponent } from './resumen-errores.component';

@Component({
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatError, MatInput, ResumenErroresComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.markAllAsTouched()">
      <app-resumen-errores />
      <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="nombre"><mat-error>Escriba el nombre</mat-error></mat-form-field>
      @if (form.touched && !especie) { <fieldset><p role="alert">Elija la especie</p><button type="button" (click)="especie = true">Perro</button></fieldset> }
      <button type="submit">Guardar</button>
    </form>`
})
class Anfitrion {
  form = new FormGroup({ nombre: new FormControl('', Validators.required) });
  especie = false;
}

describe('ResumenErroresComponent', () => {
  it('al enviar con errores lista cada campo y desaparece al corregirlos', async () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    const raiz: HTMLElement = f.nativeElement;
    expect(raiz.querySelector('.resumen')).toBeNull();

    raiz.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    f.detectChanges();
    vi.runAllTimers();
    f.detectChanges();
    const items = [...raiz.querySelectorAll('.resumen li')].map(li => li.textContent?.trim());
    expect(items).toEqual(['Nombre: Escriba el nombre', 'Elija la especie']);

    f.componentInstance.form.patchValue({ nombre: 'Luna' });
    f.componentInstance.especie = true;
    f.detectChanges();
    raiz.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }));
    vi.runAllTimers();
    f.detectChanges();
    expect(raiz.querySelector('.resumen')).toBeNull();
    vi.useRealTimers();
  });
});
