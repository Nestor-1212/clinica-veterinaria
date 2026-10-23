import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExamenesService } from '../../../core/services/examenes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario, Consulta } from '../../../core/models';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { veterinarioPorDefecto } from '../../../core/auth/permisos';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { TIPOS_EXAMEN } from '../../../core/utils/examenes';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { SelectorPacienteComponent } from '../../../shared/components/selector-paciente/selector-paciente.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatHint, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-examen',
    templateUrl: './form-examen.component.html',
    styleUrls: ['./form-examen.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatHint, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, FichaPacienteComponent, SelectorPacienteComponent]
})
export class FormExamenComponent implements OnInit {
  private fb = inject(FormBuilder);
  private examenesService = inject(ExamenesService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
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
  clientes: Cliente[] = [];
  veterinarios: Usuario[] = [];
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  consulta: Consulta | null = null;
  ficha: FichaPaciente | null = null;
  isEdit = false;
  examenId = '';
  /** Al editar un examen pendiente se abre para cargar su resultado. */
  cargandoResultado = false;
  readonly tiposExamen = TIPOS_EXAMEN;
  readonly hoy = new Date();

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: [''],
      consultaId: [''],
      veterinarioId: ['', Validators.required],
      tipo: ['', Validators.required],
      descripcion: ['', Validators.required],
      // Vacío = solicitado, pendiente de resultado (se carga después)
      resultado: [''],
      fecha: [new Date(), Validators.required]
    });
  }

  ngOnInit(): void {
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo);
    this.clientes = this.clientesService.getAll();
    // B7: solo se autoasigna si quien registra es veterinario; si no, se elige en el formulario.
    this.veterinarios = this.usuariosService.getVeterinarios();
    this.form.patchValue({ veterinarioId: veterinarioPorDefecto(this.auth.currentUser) });

    this.examenId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.examenId) {
      this.isEdit = true;
      const e = this.examenesService.getById(this.examenId);
      if (e) {
        this.form.patchValue(e);
        this.cargandoResultado = !(e.resultado || '').trim();
        // Se entró a cargar el resultado: ya no se puede guardar vacío
        if (this.cargandoResultado) this.form.get('resultado')!.setValidators(Validators.required);
        this.onMascotaChange(e.mascotaId);
        if (e.consultaId) this.consulta = this.consultasService.getById(e.consultaId) || null;
      }
    } else {
      if (params.consultaId) {
        const c = this.consultasService.getById(params.consultaId);
        if (c) {
          this.consulta = c;
          this.form.patchValue({ consultaId: c.id, veterinarioId: c.veterinarioId });
          this.onMascotaChange(c.mascotaId);
        }
      } else if (params.mascotaId) {
        this.onMascotaChange(params.mascotaId);
      }
    }
  }

  onMascotaChange(id: string): void {
    this.form.patchValue({ mascotaId: id });
    this.mascota = id ? this.mascotasService.getById(id) || null : null;
    this.cliente = this.mascota ? this.clientesService.getById(this.mascota.clienteId) || null : null;
    this.form.patchValue({ clienteId: this.mascota?.clienteId ?? '' });
    this.ficha = this.mascota
      ? fichaPaciente(this.mascota, this.cliente ?? undefined, this.consultasService.getAll(), this.vacunasService.getAll(), new Date())
      : null;
  }

  elegirTipo(tipo: string): void {
    this.form.patchValue({ tipo });
    this.form.get('tipo')!.markAsTouched();
  }

  get pacienteInvalido(): boolean {
    const c = this.form.get('mascotaId')!;
    return c.invalid && c.touched;
  }

  get sinResultado(): boolean { return !(this.form.value.resultado || '').trim(); }

  get textoGuardar(): string {
    if (this.cargandoResultado) return 'Guardar resultado';
    return this.sinResultado ? 'Guardar como pendiente' : 'Guardar con resultado';
  }
  get iconoGuardar(): string { return this.sinResultado && !this.cargandoResultado ? 'schedule' : 'task_alt'; }

  onSubmit(): void {
    if (this.enviando) return;
    if (this.form.get('mascotaId')!.invalid) {
      this.form.markAllAsTouched();
      this.host?.nativeElement.querySelector('#selector-paciente')?.focus();
      return;
    }
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const data = this.form.value;
    if (this.isEdit) { this.examenesService.update(this.examenId, data); } else { this.examenesService.create(data); }
    this.snack.open(this.sinResultado ? 'Examen solicitado: queda pendiente de resultado' : 'Examen guardado con su resultado', 'OK', { duration: 3000 });
    this.router.navigate(['/examenes']);
  }
}
