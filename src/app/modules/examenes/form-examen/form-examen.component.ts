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
import { Mascota, Cliente, Usuario, Consulta, ArchivoAdjunto } from '../../../core/models';
import { ArchivosService, tamanoLegible, validarAdjunto } from '../../../core/services/archivos.service';
import { StorageService } from '../../../core/services/storage.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { veterinarioPorDefecto } from '../../../core/auth/permisos';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { TIPOS_EXAMEN } from '../../../core/utils/examenes';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { SelectorPacienteComponent } from '../../../shared/components/selector-paciente/selector-paciente.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatHint, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-examen',
    templateUrl: './form-examen.component.html',
    styleUrls: ['./form-examen.component.scss'],
    imports: [MatIcon, MatButton, MatIconButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatHint, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, FichaPacienteComponent, SelectorPacienteComponent]
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
  private archivosService = inject(ArchivosService);
  private storage = inject(StorageService);

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
  readonly tamano = tamanoLegible;

  /** Adjuntos ya guardados del examen. */
  archivos: ArchivoAdjunto[] = [];
  /** Archivos elegidos ahora: se guardan al guardar el examen (cancelar no deja nada). */
  nuevos: { meta: ArchivoAdjunto; archivo: File }[] = [];
  /** Adjuntos guardados que se quitaron (se borran al guardar). */
  private quitados: string[] = [];
  erroresArchivo: string[] = [];
  arrastrando = false;
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
        this.archivos = [...(e.archivos ?? [])];
        this.cargandoResultado = !(e.resultado || '').trim() && !this.archivos.length;
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

  /** Sin texto de resultado ni archivo del laboratorio: el examen queda pendiente. */
  get sinResultado(): boolean { return !(this.form.value.resultado || '').trim() && !this.archivos.length && !this.nuevos.length; }

  // ---------- Archivos ----------
  alElegirArchivos(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.agregar(Array.from(input.files ?? []));
    input.value = '';
  }

  alSoltar(ev: DragEvent): void {
    ev.preventDefault();
    this.arrastrando = false;
    this.agregar(Array.from(ev.dataTransfer?.files ?? []));
  }

  alArrastrar(ev: DragEvent, encima: boolean): void {
    ev.preventDefault();
    this.arrastrando = encima;
  }

  private agregar(archivos: File[]): void {
    this.erroresArchivo = [];
    for (const archivo of archivos) {
      const error = validarAdjunto(archivo);
      if (error) { this.erroresArchivo.push(error); continue; }
      this.nuevos.push({
        archivo,
        meta: { id: this.storage.generateId(), nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, fecha: new Date() }
      });
    }
    if (this.nuevos.length) this.form.get('resultado')!.setErrors(null);
  }

  quitarNuevo(i: number): void { this.nuevos.splice(i, 1); }

  quitarGuardado(a: ArchivoAdjunto): void {
    this.archivos = this.archivos.filter(x => x.id !== a.id);
    this.quitados.push(a.id);
  }

  /** Abre el archivo en otra pestaña (el visor de PDF del navegador). */
  async ver(a: ArchivoAdjunto, archivo?: File): Promise<void> {
    const contenido = archivo ?? await this.archivosService.obtener(a.id).catch(() => undefined);
    if (!contenido) { this.snack.open('No se encontró el archivo en este navegador', 'OK', { duration: 3000 }); return; }
    const url = URL.createObjectURL(contenido);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  get textoGuardar(): string {
    if (this.cargandoResultado) return 'Guardar resultado';
    return this.sinResultado ? 'Guardar como pendiente' : 'Guardar con resultado';
  }
  get iconoGuardar(): string { return this.sinResultado && !this.cargandoResultado ? 'schedule' : 'task_alt'; }

  async onSubmit(): Promise<void> {
    if (this.enviando) return;
    // Se entró a cargar el resultado: hace falta el texto o el archivo del laboratorio
    if (this.cargandoResultado && this.sinResultado) {
      const r = this.form.get('resultado')!;
      r.setErrors({ required: true });
      r.markAsTouched();
      this.host?.nativeElement.querySelector('[formcontrolname="resultado"]')?.focus();
      return;
    }
    if (this.form.get('mascotaId')!.invalid) {
      this.form.markAllAsTouched();
      this.host?.nativeElement.querySelector('#selector-paciente')?.focus();
      return;
    }
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    try {
      for (const n of this.nuevos) await this.archivosService.guardar(n.meta.id, n.archivo);
      for (const id of this.quitados) await this.archivosService.eliminar(id).catch(() => undefined);
    } catch {
      this.enviando = false;
      this.snack.open('No se pudo guardar el archivo en este navegador. Intente de nuevo.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      return;
    }
    const data = { ...this.form.value, archivos: [...this.archivos, ...this.nuevos.map(n => n.meta)] };
    if (this.isEdit) { this.examenesService.update(this.examenId, data); } else { this.examenesService.create(data); }
    this.snack.open(this.sinResultado ? 'Examen solicitado: queda pendiente de resultado' : 'Examen guardado con su resultado', 'OK', { duration: 3000 });
    this.router.navigate(['/examenes']);
  }
}
