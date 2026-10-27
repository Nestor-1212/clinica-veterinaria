import { Component, OnInit, inject, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente, TipoMascota } from '../../../core/models';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { edadEnAnios, sugerirRazas } from '../../../core/utils/mascotas';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix, MatError, MatHint, MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/select';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { SelectorClienteComponent } from '../../../shared/components/selector-cliente/selector-cliente.component';
import { ResumenErroresComponent } from '../../../shared/components/resumen-errores/resumen-errores.component';

@Component({
    selector: 'app-form-mascota',
    templateUrl: './form-mascota.component.html',
    styleUrls: ['./form-mascota.component.scss'],
    imports: [ResumenErroresComponent, SelectorClienteComponent, MatIcon, MatButton, ReactiveFormsModule, MatFormField, MatLabel, MatOption, MatSuffix, MatError, MatHint, MatInput, MatAutocomplete, MatAutocompleteTrigger, MatDatepickerInput, MatDatepickerToggle, MatDatepicker, EdadPipe]
})
export class FormMascotaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  isEdit = false;
  mascotaId = '';
  nombreOriginal = '';
  clientes: Cliente[] = [];
  readonly tipos: TipoMascota[] = ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro'];
  readonly iconoEspecie = ICONO_ESPECIE;
  readonly hoy = new Date();
  razas: string[] = sugerirRazas('Perro', '');
  fotoPreview: string | null = null;
  /** A dónde vuelve Cancelar: al expediente si se llegó desde un cliente. */
  volverA: string[] = ['/mascotas'];

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      // Sin valor por defecto: una especie o sexo equivocados quedarían en el expediente sin que nadie lo note
      tipo: ['', Validators.required],
      raza: ['', Validators.required],
      sexo: ['', Validators.required],
      // Vacíos al empezar (antes "0", que había que borrar)
      edad: [null, [Validators.required, Validators.min(0)]],
      peso: [null, [Validators.required, Validators.min(0.1)]],
      color: ['', Validators.required],
      fechaNacimiento: [''],
      alergias: [''],
      sinAlergiasConocidas: [false],
      foto: ['']
    });
    const ctrl = (n: string) => this.form.get(n)!;
    ctrl('tipo').valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.actualizarRazas());
    ctrl('raza').valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.actualizarRazas());
    // Con fecha de nacimiento, la edad se calcula sola
    ctrl('fechaNacimiento').valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(f => {
      const anios = edadEnAnios(f, this.hoy);
      if (anios !== null) ctrl('edad').setValue(anios);
    });
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    this.mascotaId = this.route.snapshot.params.id;

    const clienteId = this.route.snapshot.queryParams.clienteId;
    if (clienteId) {
      this.form.patchValue({ clienteId });
      this.volverA = ['/clientes', clienteId];
    }

    if (this.mascotaId) {
      this.isEdit = true;
      this.volverA = ['/mascotas', this.mascotaId];
      const m = this.mascotasService.getById(this.mascotaId);
      if (m) {
        this.form.patchValue(m);
        this.nombreOriginal = m.nombre;
        this.fotoPreview = m.foto || null;
      }
    }
  }

  elegirDueno(id: string): void {
    this.form.patchValue({ clienteId: id });
    this.form.get('clienteId')!.markAsTouched();
  }

  get duenoInvalido(): boolean {
    const c = this.form.get('clienteId')!;
    return c.invalid && c.touched;
  }

  get dueno(): Cliente | undefined {
    const id = this.form.get('clienteId')?.value;
    return id ? this.clientes.find(c => c.id === id) : undefined;
  }

  especie(tipo: TipoMascota): string { return ICONO_ESPECIE[tipo] ?? ICONO_ESPECIE.Otro; }

  /** Valor de un campo para la vista previa. */
  v(nombre: string) { return this.form.get(nombre)?.value; }

  private actualizarRazas(): void {
    this.razas = sugerirRazas(this.v('tipo'), this.v('raza'));
  }

  onFotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.fotoPreview = e.target?.result as string;
      this.form.patchValue({ foto: this.fotoPreview });
    };
    reader.readAsDataURL(file);
  }

  quitarFoto(): void {
    this.fotoPreview = null;
    this.form.patchValue({ foto: '' });
  }

  /** "Sin alergias conocidas" y una lista de alergias se excluyen: marcar uno borra el otro. */
  alMarcarSinAlergias(): void {
    if (this.v('sinAlergiasConocidas')) this.form.patchValue({ alergias: '' });
  }

  onSubmit(): void {
    if (this.enviando) return;
    if (this.form.get('clienteId')!.invalid) {
      this.form.markAllAsTouched();
      this.host?.nativeElement.querySelector('#selector-cliente')?.focus();
      return;
    }
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const data = this.form.value;
    if (this.isEdit) {
      this.mascotasService.update(this.mascotaId, data);
      this.snack.open('Mascota actualizada', 'OK', { duration: 2000 });
    } else {
      this.mascotasService.create(data);
      this.snack.open('Mascota registrada', 'OK', { duration: 2000 });
    }
    const clienteId = this.form.value.clienteId;
    this.router.navigate(['/clientes', clienteId]);
  }

  cancelar(): void {
    this.router.navigate(this.volverA);
  }
}
