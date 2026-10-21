import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente, TipoMascota } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatSuffix, MatError, MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-mascota',
    templateUrl: './form-mascota.component.html',
    styleUrls: ['./form-mascota.component.scss'],
    imports: [MatIcon, MatButton, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatSuffix, MatError, MatInput, MatDatepickerInput, MatDatepickerToggle, MatDatepicker]
})
export class FormMascotaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  isEdit = false;
  mascotaId = '';
  clientes: Cliente[] = [];
  tipos: TipoMascota[] = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];
  sexos = ['macho', 'hembra'];
  fotoPreview: string | null = null;

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      tipo: ['Perro', Validators.required],
      raza: ['', Validators.required],
      sexo: ['macho', Validators.required],
      edad: [0, [Validators.required, Validators.min(0)]],
      peso: [0, [Validators.required, Validators.min(0.1)]],
      color: ['', Validators.required],
      fechaNacimiento: [''],
      alergias: [''],
      foto: ['']
    });
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    this.mascotaId = this.route.snapshot.params.id;

    const clienteId = this.route.snapshot.queryParams.clienteId;
    if (clienteId) this.form.patchValue({ clienteId });

    if (this.mascotaId) {
      this.isEdit = true;
      const m = this.mascotasService.getById(this.mascotaId);
      if (m) {
        this.form.patchValue(m);
        this.fotoPreview = m.foto || null;
      }
    }
  }

  onFotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.fotoPreview = e.target?.result as string;
      this.form.patchValue({ foto: this.fotoPreview });
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const data = this.form.value;
    if (this.isEdit) {
      this.mascotasService.update(this.mascotaId, data);
      this.snack.open('Mascota actualizada', 'OK', { duration: 2000 });
    } else {
      this.mascotasService.create(data);
      this.snack.open('Mascota registrada', 'OK', { duration: 2000 });
    }
    const clienteId = this.form.value.clienteId;
    this.router.navigate(['/clientes', clienteId]);
  }

  cancelar(): void {
    this.router.navigate(['/mascotas']);
  }
}
