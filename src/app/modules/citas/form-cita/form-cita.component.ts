import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { habilitarSi, validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
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
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  veterinarios: Usuario[] = [];
  isInmediata = false;
  horas = this.generarHoras();

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      // Se habilita al elegir propietario (onClienteChange); antes era [disabled] en la plantilla
      mascotaId: [{ value: '', disabled: true }, Validators.required],
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
    habilitarSi(this.form.get('mascotaId'), !!clienteId);
    this.mascotas = this.mascotasService.getByCliente(clienteId);
    if (this.mascotas.length === 1) this.form.patchValue({ mascotaId: this.mascotas[0].id });
  }

  onSubmit(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const cita = this.citasService.create(this.form.value);
    if (!this.isInmediata) {
      this.snack.open('Cita programada', 'OK', { duration: 2000 });
      this.router.navigate(['/citas']);
      return;
    }
    // B1: la consulta recibe el citaId para quedar vinculada (tipo 'inmediata') y cerrar la cita al guardarse.
    if (puedeAcceder(this.auth.currentUser?.rol, 'consultas')) {
      this.snack.open('¡Atención inmediata registrada!', 'OK', { duration: 2000 });
      this.router.navigate(['/consultas/nueva'], {
        queryParams: { citaId: cita.id, mascotaId: cita.mascotaId, clienteId: cita.clienteId }
      });
    } else {
      // Recepción no tiene acceso a Consultas: el veterinario la iniciará desde Citas.
      this.snack.open('Atención inmediata registrada. El veterinario iniciará la consulta desde Citas.', 'OK', { duration: 4000 });
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
