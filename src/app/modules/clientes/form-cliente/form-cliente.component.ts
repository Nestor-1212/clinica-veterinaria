import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../../../core/services/clientes.service';

@Component({
  selector: 'app-form-cliente',
  templateUrl: './form-cliente.component.html',
  styleUrls: ['./form-cliente.component.scss']
})
export class FormClienteComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  clienteId = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private clientesService: ClientesService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {
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
    if (this.form.invalid) return;

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
    this.loading = false;
    this.router.navigate(['/clientes']);
  }

  cancelar(): void {
    this.router.navigate(['/clientes']);
  }
}
