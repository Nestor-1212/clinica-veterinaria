import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente, TipoMascota } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-form-mascota',
  templateUrl: './form-mascota.component.html',
  styleUrls: ['./form-mascota.component.scss']
})
export class FormMascotaComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  mascotaId = '';
  clientes: Cliente[] = [];
  tipos: TipoMascota[] = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];
  sexos = ['macho', 'hembra'];
  fotoPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private mascotasService: MascotasService,
    private clientesService: ClientesService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {
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
