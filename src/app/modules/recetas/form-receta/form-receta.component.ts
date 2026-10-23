import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecetasService } from '../../../core/services/recetas.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Mascota, Cliente, Consulta, ItemReceta } from '../../../core/models';
import { veterinarioPorDefecto } from '../../../core/auth/permisos';
import { VacunasService } from '../../../core/services/vacunas.service';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { DURACIONES, FRECUENCIAS, alergiaEnMedicamento, filtrarSugerencias, medicamentosFrecuentes } from '../../../core/utils/recetas';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';

@Component({
    selector: 'app-form-receta',
    templateUrl: './form-receta.component.html',
    styleUrls: ['./form-receta.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatIconButton, MatTooltip, MatFormField, MatLabel, MatInput, MatError, MatAutocomplete, MatAutocompleteTrigger, MatOption, FichaPacienteComponent]
})
export class FormRecetaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private recetasService = inject(RecetasService);
  private consultasService = inject(ConsultasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private pdfService = inject(PdfService);
  private vacunasService = inject(VacunasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  consulta: Consulta | null = null;
  isEdit = false;
  recetaId = '';
  ficha: FichaPaciente | null = null;
  /** Medicamentos más usados en la clínica (sugerencias al escribir). */
  medicamentos: string[] = [];
  readonly frecuencias = FRECUENCIAS;
  readonly duraciones = DURACIONES;
  /** A dónde vuelven Cancelar y Volver: a la receta al editar, a Consultas al crear. */
  volverA: string[] = ['/consultas'];

  constructor() {
    this.form = this.fb.group({
      consultaId: [''],
      mascotaId: ['', Validators.required],
      clienteId: ['', Validators.required],
      veterinarioId: ['', Validators.required],
      fecha: [new Date()],
      items: this.fb.array([this.crearItem()]),
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    // B7: la receta la firma el veterinario de la consulta; sin consulta, solo se autoasigna a un veterinario.
    this.form.patchValue({ veterinarioId: veterinarioPorDefecto(this.auth.currentUser) });

    this.medicamentos = medicamentosFrecuentes(this.recetasService.getAll());
    this.recetaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.recetaId) {
      this.isEdit = true;
      this.volverA = ['/recetas', this.recetaId];
      const r = this.recetasService.getById(this.recetaId);
      if (r) {
        this.form.patchValue(r);
        this.items.clear();
        r.items.forEach(item => this.items.push(this.crearItem(item)));
        this.cargarDatos(r.mascotaId, r.clienteId, r.consultaId);
      }
    } else if (params.consultaId) {
      const c = this.consultasService.getById(params.consultaId);
      if (c) {
        this.consulta = c;
        this.form.patchValue({ consultaId: c.id, mascotaId: c.mascotaId, clienteId: c.clienteId, veterinarioId: c.veterinarioId });
        this.cargarDatos(c.mascotaId, c.clienteId);
      }
    }
  }

  cargarDatos(mascotaId: string, clienteId: string, consultaId?: string): void {
    this.mascota = this.mascotasService.getById(mascotaId) || null;
    this.cliente = this.clientesService.getById(clienteId) || null;
    if (consultaId) this.consulta = this.consultasService.getById(consultaId) || null;
    if (this.mascota) {
      this.ficha = fichaPaciente(this.mascota, this.cliente ?? undefined, this.consultasService.getAll(), this.vacunasService.getAll(), new Date(), this.consulta?.id);
    }
  }

  /** Sugerencias para un campo de un medicamento según lo escrito. */
  sugerir(opciones: readonly string[], texto: string): string[] {
    return filtrarSugerencias([...opciones], texto).slice(0, 8);
  }

  /** Palabra de las alergias de la mascota que aparece en el medicamento i (o null). */
  alergiaDe(i: number): string | null {
    return alergiaEnMedicamento(this.mascota?.alergias, this.items.at(i)?.get('medicamento')?.value);
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  crearItem(data?: Partial<ItemReceta>): FormGroup {
    return this.fb.group({
      medicamento: [data?.medicamento || '', Validators.required],
      dosis: [data?.dosis || '', Validators.required],
      frecuencia: [data?.frecuencia || '', Validators.required],
      duracion: [data?.duracion || '', Validators.required],
      indicaciones: [data?.indicaciones || '']
    });
  }

  agregarItem(): void {
    this.items.push(this.crearItem());
    // Foco en el nombre del nuevo medicamento
    setTimeout(() => this.host?.nativeElement.querySelector(`#med-${this.items.length - 1}`)?.focus());
  }
  removerItem(i: number): void { if (this.items.length > 1) this.items.removeAt(i); }

  onSubmit(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const data = this.form.value;
    let receta;
    if (this.isEdit) {
      this.recetasService.update(this.recetaId, data);
      receta = this.recetasService.getById(this.recetaId)!;
    } else {
      receta = this.recetasService.create(data);
    }
    this.snack.open('Receta guardada', 'OK', { duration: 2000 });
    this.router.navigate(['/recetas', receta.id]);
  }

  async imprimirPDF(): Promise<void> {
    if (this.form.invalid || !this.mascota || !this.cliente) return;
    // B7: el PDF lo firma el veterinario de la receta, no el usuario que la imprime.
    const vet = this.usuariosService.getById(this.form.value.veterinarioId);
    if (!vet) return;
    const receta = { ...this.form.value, id: this.recetaId || 'preview' };
    await this.pdfService.generarReceta(receta, this.mascota, this.cliente, vet);
  }
}
