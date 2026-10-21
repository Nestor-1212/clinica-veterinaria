import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConsultasService } from '../../../core/services/consultas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { CitasService } from '../../../core/services/citas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario, Consulta } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatError, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatDivider } from '@angular/material/list';
import { TitleCasePipe } from '@angular/common';

@Component({
    selector: 'app-form-consulta',
    templateUrl: './form-consulta.component.html',
    styleUrls: ['./form-consulta.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, MatDivider, TitleCasePipe]
})
export class FormConsultaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private consultasService = inject(ConsultasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private citasService = inject(CitasService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  veterinarios: Usuario[] = [];
  isEdit = false;
  consultaId = '';

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: ['', Validators.required],
      veterinarioId: ['', Validators.required],
      citaId: [''],
      fecha: [new Date(), Validators.required],
      sintomas: ['', Validators.required],
      temperatura: ['', [Validators.required, Validators.min(30), Validators.max(45)]],
      peso: ['', [Validators.required, Validators.min(0.1)]],
      diagnostico: ['', Validators.required],
      tratamiento: ['', Validators.required],
      observaciones: [''],
      tipo: ['cita']
    });
  }

  ngOnInit(): void {
    this.veterinarios = this.usuariosService.getVeterinarios();
    const user = this.auth.currentUser;
    if (user?.rol === 'veterinario') this.form.patchValue({ veterinarioId: user.id });

    this.consultaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.consultaId) {
      this.isEdit = true;
      const c = this.consultasService.getById(this.consultaId);
      if (c) {
        this.form.patchValue(c);
        this.cargarMascotaYCliente(c.mascotaId, c.clienteId);
      }
      return;
    }

    if (params.mascotaId) {
      this.form.patchValue({ mascotaId: params.mascotaId });
      this.cargarMascotaYCliente(params.mascotaId, params.clienteId);
    }
    if (params.clienteId) this.form.patchValue({ clienteId: params.clienteId });
    if (params.citaId) {
      const cita = this.citasService.getById(params.citaId);
      if (cita) {
        // B2: la cita NO se completa al abrir el formulario, sino al guardar la consulta.
        this.form.patchValue({ citaId: cita.id, tipo: cita.estado === 'inmediata' ? 'inmediata' : 'cita' });
      }
    }
  }

  cargarMascotaYCliente(mascotaId: string, clienteId: string): void {
    this.mascota = this.mascotasService.getById(mascotaId) || null;
    this.cliente = this.clientesService.getById(clienteId) || null;
    if (this.mascota) this.form.patchValue({ peso: this.mascota.peso });
  }

  /** Guarda la consulta y, si es nueva y viene de una cita, marca esa cita como completada. */
  private guardar(): Consulta {
    const data = this.form.value;
    if (this.isEdit) {
      this.consultasService.update(this.consultaId, data);
      return this.consultasService.getById(this.consultaId)!;
    }
    const consulta = this.consultasService.create(data);
    if (consulta.citaId && this.citasService.getById(consulta.citaId)) {
      this.citasService.update(consulta.citaId, { estado: 'completada' });
    }
    return consulta;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const consulta = this.guardar();
    this.snack.open(this.isEdit ? 'Consulta actualizada' : 'Consulta registrada', 'OK', { duration: 2000 });
    this.router.navigate(['/recetas/nueva'], { queryParams: { consultaId: consulta.id } });
  }

  guardarSinReceta(): void {
    if (this.form.invalid) return;
    this.guardar();
    this.snack.open('Consulta guardada', 'OK', { duration: 2000 });
    this.router.navigate(['/consultas']);
  }
}
