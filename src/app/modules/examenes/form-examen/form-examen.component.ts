import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExamenesService } from '../../../core/services/examenes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario } from '../../../core/models';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { veterinarioPorDefecto } from '../../../core/auth/permisos';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatError, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-examen',
    templateUrl: './form-examen.component.html',
    styleUrls: ['./form-examen.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker]
})
export class FormExamenComponent implements OnInit {
  private fb = inject(FormBuilder);
  private examenesService = inject(ExamenesService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private auth = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  mascotas: Mascota[] = [];
  veterinarios: Usuario[] = [];
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
      veterinarioId: ['', Validators.required],
      tipo: ['', Validators.required],
      descripcion: ['', Validators.required],
      resultado: ['', Validators.required],
      fecha: [new Date(), Validators.required]
    });
  }

  ngOnInit(): void {
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo);
    const user = this.auth.currentUser;
    // B7: solo se autoasigna si quien registra es veterinario; si no, se elige en el formulario.
    this.veterinarios = this.usuariosService.getVeterinarios();
    this.form.patchValue({ veterinarioId: veterinarioPorDefecto(user) });

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
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const data = this.form.value;
    if (this.isEdit) { this.examenesService.update(this.examenId, data); } else { this.examenesService.create(data); }
    this.snack.open('Examen registrado', 'OK', { duration: 2000 });
    this.router.navigate(['/examenes']);
  }
}
