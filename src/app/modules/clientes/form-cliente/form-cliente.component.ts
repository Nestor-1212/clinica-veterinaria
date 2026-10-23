import { Component, OnInit, inject, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente } from '../../../core/models';
import { formatearTelefono } from '../../../core/utils/clientes';
import { enlaceWhatsApp } from '../../../core/utils/metricas';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatError, MatHint } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-form-cliente',
    templateUrl: './form-cliente.component.html',
    styleUrls: ['./form-cliente.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatHint, MatProgressSpinner]
})
export class FormClienteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;
  isEdit = false;
  clienteId = '';
  /** Nombre guardado del cliente en edición (el subtítulo no cambia mientras se escribe). */
  nombreOriginal = '';
  /** true desde que se acepta el envío hasta navegar: evita el doble envío. */
  loading = false;
  /** Cliente activo que ya usa la cédula escrita (se avisa mientras se escribe). */
  duplicado: Cliente | null = null;
  private host = inject(ElementRef, { optional: true });

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      cedula: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      correo: ['', [Validators.email]],
      direccion: ['']
    });
    this.form.get('cedula')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(c => this.revisarCedula(c));
  }

  ngOnInit(): void {
    this.clienteId = this.route.snapshot.params.id;
    if (this.clienteId) {
      this.isEdit = true;
      const cliente = this.clientesService.getById(this.clienteId);
      if (cliente) {
        this.form.patchValue(cliente);
        this.nombreOriginal = cliente.nombre;
      }
    }
  }

  /** Valor de un campo para la vista previa. */
  v(nombre: string): string { return (this.form.get(nombre)?.value || '').trim(); }

  get iniciales(): string {
    return this.v('nombre').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  get whatsapp(): string | null {
    return enlaceWhatsApp(this.v('telefono'), '');
  }

  /** Al salir del teléfono se le pone el guion (60001111 → 6000-1111). */
  formatearTelefono(): void {
    const control = this.form.get('telefono')!;
    const formateado = formatearTelefono(control.value);
    if (formateado !== control.value) control.setValue(formateado);
  }

  private revisarCedula(cedula: string): void {
    const c = (cedula || '').trim().toUpperCase();
    this.duplicado = c
      ? this.clientesService.getAll().find(x => x.activo && x.id !== this.clienteId && x.cedula.toUpperCase() === c) ?? null
      : null;
    const control = this.form.get('cedula')!;
    // Los validadores ya corrieron con este valor: se suma o se quita solo el error de duplicado
    const errores: Record<string, unknown> = { ...(control.errors ?? {}) };
    delete errores['duplicada'];
    if (this.duplicado) errores['duplicada'] = true;
    control.setErrors(Object.keys(errores).length ? errores : null);
  }

  /** @param conMascota tras registrar, abre el alta de su mascota. */
  onSubmit(conMascota = false): void {
    if (this.loading) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;

    const cedula = this.form.value.cedula;
    if (this.clientesService.existeCedula(cedula, this.isEdit ? this.clienteId : undefined)) {
      this.snack.open('Ya existe un cliente con esa cédula', 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    this.loading = true;
    const datos = { ...this.form.value, telefono: formatearTelefono(this.form.value.telefono) };
    if (this.isEdit) {
      this.clientesService.update(this.clienteId, datos);
      this.snack.open('Cliente actualizado', 'OK', { duration: 2000 });
      this.router.navigate(this.destino());
      return;
    }
    const nuevo = this.clientesService.create(datos);
    this.snack.open('Cliente registrado', 'OK', { duration: 2000 });
    // loading sigue en true hasta que la navegación desmonte el formulario
    if (conMascota) this.router.navigate(['/mascotas/nueva'], { queryParams: { clienteId: nuevo.id } });
    else this.router.navigate(this.destino());
  }

  cancelar(): void {
    this.router.navigate(this.destino());
  }

  /** Al editar se vuelve al expediente del cliente; al registrar, a la lista. */
  private destino(): string[] {
    return this.isEdit ? ['/clientes', this.clienteId] : ['/clientes'];
  }
}
