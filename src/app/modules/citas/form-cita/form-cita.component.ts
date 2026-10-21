import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cliente, Mascota, Usuario } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatSuffix, MatError, MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-cita',
    templateUrl: './form-cita.component.html',
    styleUrls: ['./form-cita.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatSuffix, MatError, MatInput, MatDatepickerInput, MatDatepickerToggle, MatDatepicker]
})
export class FormCitaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private citasService = inject(CitasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  veterinarios: Usuario[] = [];
  isInmediata = false;
  horas = this.generarHoras();

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      mascotaId: ['', Validators.required],
      veterinarioId: ['', Validators.required],
      fecha: [new Date(), Validators.required],
      hora: ['08:00', Validators.required],
      motivo: ['', Validators.required],
      estado: ['pendiente'],
      notas: ['']
    });
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    this.veterinarios = this.usuariosService.getVeterinarios();

    const params = this.route.snapshot.queryParams;
    if (params.tipo === 'inmediata') {
      this.isInmediata = true;
      this.form.patchValue({ estado: 'inmediata', fecha: new Date(), hora: new Date().toTimeString().substr(0, 5) });
    }
    if (params.clienteId) {
      this.form.patchValue({ clienteId: params.clienteId });
      this.onClienteChange(params.clienteId);
    }
  }

  onClienteChange(clienteId: string): void {
    this.mascotas = this.mascotasService.getByCliente(clienteId);
    if (this.mascotas.length === 1) this.form.patchValue({ mascotaId: this.mascotas[0].id });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.citasService.create(this.form.value);
    this.snack.open(this.isInmediata ? '¡Atención inmediata registrada!' : 'Cita programada', 'OK', { duration: 2000 });
    if (this.isInmediata) {
      const { mascotaId, clienteId } = this.form.value;
      this.router.navigate(['/consultas/nueva'], { queryParams: { mascotaId, clienteId } });
    } else {
      this.router.navigate(['/citas']);
    }
  }

  generarHoras(): string[] {
    const h = [];
    for (let i = 7; i <= 20; i++) {
      h.push(`${String(i).padStart(2, '0')}:00`);
      h.push(`${String(i).padStart(2, '0')}:30`);
    }
    return h;
  }
}
