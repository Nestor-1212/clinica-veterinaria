import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Cliente, Mascota, Usuario } from '../../../core/models';

@Component({
  selector: 'app-form-cita',
  templateUrl: './form-cita.component.html',
  styleUrls: ['./form-cita.component.scss']
})
export class FormCitaComponent implements OnInit {
  form: FormGroup;
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  veterinarios: Usuario[] = [];
  isInmediata = false;
  horas = this.generarHoras();

  constructor(
    private fb: FormBuilder,
    private citasService: CitasService,
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private usuariosService: UsuariosService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {
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
