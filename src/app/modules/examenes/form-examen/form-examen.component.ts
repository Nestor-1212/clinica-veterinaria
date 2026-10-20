import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExamenesService } from '../../../core/services/examenes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-form-examen',
  templateUrl: './form-examen.component.html',
  styleUrls: ['./form-examen.component.scss']
})
export class FormExamenComponent implements OnInit {
  private fb = inject(FormBuilder);
  private examenesService = inject(ExamenesService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  mascotas: Mascota[] = [];
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  isEdit = false;
  examenId = '';
  tiposExamen = ['Hemograma', 'Química sanguínea', 'Urianálisis', 'Coprológico', 'Radiografía', 'Ecografía', 'Cultivo', 'PCR', 'ELISA', 'Otro'];

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: [''],
      consultaId: [''],
      veterinarioId: [''],
      tipo: ['', Validators.required],
      descripcion: ['', Validators.required],
      resultado: ['', Validators.required],
      fecha: [new Date(), Validators.required]
    });
  }

  ngOnInit(): void {
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo);
    const user = this.auth.currentUser;
    if (user) this.form.patchValue({ veterinarioId: user.id });

    this.examenId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.examenId) {
      this.isEdit = true;
      const e = this.examenesService.getById(this.examenId);
      if (e) { this.form.patchValue(e); this.onMascotaChange(e.mascotaId); }
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
    if (this.isEdit) { this.examenesService.update(this.examenId, data); } else { this.examenesService.create(data); }
    this.snack.open('Examen registrado', 'OK', { duration: 2000 });
    this.router.navigate(['/examenes']);
  }
}
