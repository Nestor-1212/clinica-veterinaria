import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../../../core/services/clientes.service';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-form-cliente',
    templateUrl: './form-cliente.component.html',
    styleUrls: ['./form-cliente.component.scss'],
    imports: [MatIcon, MatButton, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSuffix, MatError, MatProgressSpinner]
})
export class FormClienteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  isEdit = false;
  clienteId = '';
  /** true desde que se acepta el envío hasta navegar: evita el doble envío. */
  loading = false;
  private host = inject(ElementRef, { optional: true });

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      cedula: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      correo: ['', [Validators.email]],
      direccion: ['']
    });
  }

  ngOnInit(): void {
    this.clienteId = this.route.snapshot.params.id;
    if (this.clienteId) {
      this.isEdit = true;
      const cliente = this.clientesService.getById(this.clienteId);
      if (cliente) this.form.patchValue(cliente);
    }
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;

    const cedula = this.form.value.cedula;
    if (this.clientesService.existeCedula(cedula, this.isEdit ? this.clienteId : undefined)) {
      this.snack.open('Ya existe un cliente con esa cédula', 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    this.loading = true;
    if (this.isEdit) {
      this.clientesService.update(this.clienteId, this.form.value);
      this.snack.open('Cliente actualizado', 'OK', { duration: 2000 });
    } else {
      this.clientesService.create(this.form.value);
      this.snack.open('Cliente registrado exitosamente', 'OK', { duration: 2000 });
    }
    // loading sigue en true hasta que la navegación desmonte el formulario
    this.router.navigate(['/clientes']);
  }

  cancelar(): void {
    this.router.navigate(['/clientes']);
  }
}
