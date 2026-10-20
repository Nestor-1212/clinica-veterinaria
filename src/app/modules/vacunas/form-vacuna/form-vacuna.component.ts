import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VacunasService } from '../../../core/services/vacunas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-form-vacuna',
  templateUrl: './form-vacuna.component.html',
  styleUrls: ['./form-vacuna.component.scss']
})
export class FormVacunaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vacunasService = inject(VacunasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  mascotas: Mascota[] = [];
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  isEdit = false;
  vacunaId = '';

  vacunasComunes = ['Parvovirus', 'Moquillo', 'Rabia', 'Bordetella', 'Leptospira', 'Hepatitis', 'Leucemia Felina', 'Calicivirus', 'Rinotraqueitis', 'Desparasitación'];

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: [''],
      veterinarioId: [''],
      nombre: ['', Validators.required],
      lote: ['', Validators.required],
      fechaAplicacion: [new Date(), Validators.required],
      proximaFecha: ['', Validators.required],
      laboratorio: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo);
    const user = this.auth.currentUser;
    if (user) this.form.patchValue({ veterinarioId: user.id });

    this.vacunaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.vacunaId) {
      this.isEdit = true;
      const v = this.vacunasService.getById(this.vacunaId);
      if (v) { this.form.patchValue(v); this.onMascotaChange(v.mascotaId); }
    } else if (params.mascotaId) {
      this.form.patchValue({ mascotaId: params.mascotaId });
      this.onMascotaChange(params.mascotaId);
    }
  }

  onMascotaChange(id: string): void {
    this.mascota = this.mascotasService.getById(id) || null;
    if (this.mascota) {
      this.cliente = this.clientesService.getById(this.mascota.clienteId) || null;
      this.form.patchValue({ clienteId: this.mascota.clienteId });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const data = this.form.value;
    if (this.isEdit) { this.vacunasService.update(this.vacunaId, data); } else { this.vacunasService.create(data); }
    this.snack.open('Vacuna registrada', 'OK', { duration: 2000 });
    this.router.navigate(['/vacunas']);
  }
}
