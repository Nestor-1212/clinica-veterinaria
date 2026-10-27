import { Component, OnInit, inject, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VacunasService } from '../../../core/services/vacunas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario, Vacuna } from '../../../core/models';
import { veterinarioPorDefecto } from '../../../core/auth/permisos';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { REFUERZOS, VACUNAS_POR_ESPECIE, sumarDias, ultimaDosisDe } from '../../../core/utils/vacunas';
import { filtrarSugerencias } from '../../../core/utils/recetas';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { SelectorPacienteComponent } from '../../../shared/components/selector-paciente/selector-paciente.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatHint, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { DatePipe } from '@angular/common';
import { ResumenErroresComponent } from '../../../shared/components/resumen-errores/resumen-errores.component';

@Component({
    selector: 'app-form-vacuna',
    templateUrl: './form-vacuna.component.html',
    styleUrls: ['./form-vacuna.component.scss'],
    imports: [ResumenErroresComponent, MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatHint, MatInput, MatAutocomplete, MatAutocompleteTrigger, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, DatePipe, FichaPacienteComponent, SelectorPacienteComponent]
})
export class FormVacunaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vacunasService = inject(VacunasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private consultasService = inject(ConsultasService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  mascotas: Mascota[] = [];
  clientes: Cliente[] = [];
  veterinarios: Usuario[] = [];
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  ficha: FichaPaciente | null = null;
  isEdit = false;
  vacunaId = '';
  /** Laboratorios ya usados (sugerencias). */
  laboratorios: string[] = [];
  readonly refuerzos = REFUERZOS;
  readonly hoy = new Date();
  volverA: string[] = ['/vacunas'];
  private todas: Vacuna[] = [];

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: [''],
      veterinarioId: ['', Validators.required],
      nombre: ['', Validators.required],
      lote: ['', Validators.required],
      fechaAplicacion: [new Date(), Validators.required],
      proximaFecha: ['', Validators.required],
      laboratorio: [''],
      observaciones: ['']
    });
    // Al cambiar la fecha de aplicación se mantiene el mismo intervalo de refuerzo elegido
    this.form.get('fechaAplicacion')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(f => {
      if (this.refuerzoDias && f) this.form.patchValue({ proximaFecha: sumarDias(f, this.refuerzoDias) }, { emitEvent: false });
    });
  }

  /** Intervalo elegido con los botones de refuerzo (null si la fecha se puso a mano). */
  refuerzoDias: number | null = null;

  ngOnInit(): void {
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo);
    this.clientes = this.clientesService.getAll();
    this.todas = this.vacunasService.getAll();
    this.laboratorios = [...new Set(this.todas.map(v => v.laboratorio?.trim()).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b, 'es'));
    // B7: solo se autoasigna si quien registra es veterinario; si no, se elige en el formulario.
    this.veterinarios = this.usuariosService.getVeterinarios();
    this.form.patchValue({ veterinarioId: veterinarioPorDefecto(this.auth.currentUser) });

    this.vacunaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.vacunaId) {
      this.isEdit = true;
      const v = this.vacunasService.getById(this.vacunaId);
      if (v) { this.form.patchValue(v); this.onMascotaChange(v.mascotaId); }
    } else {
      if (params.mascotaId) {
        this.form.patchValue({ mascotaId: params.mascotaId });
        this.onMascotaChange(params.mascotaId);
        this.volverA = ['/mascotas', params.mascotaId];
      }
      // "Aplicar refuerzo" desde la lista: misma vacuna, refuerzo anual por defecto
      if (params.nombre) {
        this.form.patchValue({ nombre: params.nombre });
        this.elegirRefuerzo(365);
        const previa = this.ultimaDosis;
        if (previa?.laboratorio) this.form.patchValue({ laboratorio: previa.laboratorio });
        this.volverA = ['/vacunas'];
      }
    }
  }

  onMascotaChange(id: string): void {
    this.form.patchValue({ mascotaId: id });
    this.mascota = id ? this.mascotasService.getById(id) || null : null;
    this.cliente = this.mascota ? this.clientesService.getById(this.mascota.clienteId) || null : null;
    this.form.patchValue({ clienteId: this.mascota?.clienteId ?? '' });
    this.ficha = this.mascota
      ? fichaPaciente(this.mascota, this.cliente ?? undefined, this.consultasService.getAll(), this.todas, new Date())
      : null;
  }

  /** Vacunas habituales para la especie del paciente. */
  get sugeridas(): string[] {
    return this.mascota ? VACUNAS_POR_ESPECIE[this.mascota.tipo] : [];
  }

  elegirVacuna(nombre: string): void {
    this.form.patchValue({ nombre });
    this.form.get('nombre')!.markAsTouched();
    if (!this.form.value.proximaFecha) this.elegirRefuerzo(365);
  }

  elegirRefuerzo(dias: number): void {
    this.refuerzoDias = dias;
    this.form.patchValue({ proximaFecha: sumarDias(this.form.value.fechaAplicacion || new Date(), dias) });
  }

  /** La próxima fecha escrita a mano deja de seguir a un botón de refuerzo. */
  proximaManual(): void { this.refuerzoDias = null; }

  get ultimaDosis(): Vacuna | undefined {
    return ultimaDosisDe(this.todas, this.form.value.mascotaId, this.form.value.nombre, this.vacunaId || undefined);
  }

  sugerirLaboratorio(texto: string): string[] { return filtrarSugerencias(this.laboratorios, texto).slice(0, 6); }

  get pacienteInvalido(): boolean {
    const c = this.form.get('mascotaId')!;
    return c.invalid && c.touched;
  }

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
    if (this.isEdit) { this.vacunasService.update(this.vacunaId, data); } else { this.vacunasService.create(data); }
    this.snack.open(this.isEdit ? 'Vacuna actualizada' : 'Vacuna registrada', 'OK', { duration: 2000 });
    this.router.navigate(['/vacunas']);
  }
}
