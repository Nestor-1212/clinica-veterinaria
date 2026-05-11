import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConsultasService } from '../../../core/services/consultas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { CitasService } from '../../../core/services/citas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario } from '../../../core/models';

@Component({
  selector: 'app-form-consulta',
  templateUrl: './form-consulta.component.html',
  styleUrls: ['./form-consulta.component.scss']
})
export class FormConsultaComponent implements OnInit {
  form: FormGroup;
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  veterinarios: Usuario[] = [];
  isEdit = false;
  consultaId = '';

  constructor(
    private fb: FormBuilder,
    private consultasService: ConsultasService,
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private usuariosService: UsuariosService,
    private citasService: CitasService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {
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
        this.form.patchValue({ citaId: cita.id, tipo: cita.estado === 'inmediata' ? 'inmediata' : 'cita' });
        this.citasService.update(cita.id, { estado: 'completada' });
      }
    }
  }

  cargarMascotaYCliente(mascotaId: string, clienteId: string): void {
    this.mascota = this.mascotasService.getById(mascotaId) || null;
    this.cliente = this.clientesService.getById(clienteId) || null;
    if (this.mascota) this.form.patchValue({ peso: this.mascota.peso });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const data = this.form.value;
    let consulta;
    if (this.isEdit) {
      this.consultasService.update(this.consultaId, data);
      consulta = this.consultasService.getById(this.consultaId)!;
      this.snack.open('Consulta actualizada', 'OK', { duration: 2000 });
    } else {
      consulta = this.consultasService.create(data);
      this.snack.open('Consulta registrada', 'OK', { duration: 2000 });
    }
    this.router.navigate(['/recetas/nueva'], { queryParams: { consultaId: consulta.id } });
  }

  guardarSinReceta(): void {
    if (this.form.invalid) return;
    if (this.isEdit) {
      this.consultasService.update(this.consultaId, this.form.value);
    } else {
      this.consultasService.create(this.form.value);
    }
    this.snack.open('Consulta guardada', 'OK', { duration: 2000 });
    this.router.navigate(['/consultas']);
  }
}
