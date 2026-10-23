import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConsultasService } from '../../../core/services/consultas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { CitasService } from '../../../core/services/citas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mascota, Cliente, Usuario, Consulta } from '../../../core/models';
import { VacunasService } from '../../../core/services/vacunas.service';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { EstadoTemperatura, RANGO_TEMPERATURA, cambioPeso, evaluarTemperatura } from '../../../core/utils/consultas';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatHint, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-consulta',
    templateUrl: './form-consulta.component.html',
    styleUrls: ['./form-consulta.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatHint, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, FichaPacienteComponent]
})
export class FormConsultaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private consultasService = inject(ConsultasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private citasService = inject(CitasService);
  private vacunasService = inject(VacunasService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  veterinarios: Usuario[] = [];
  isEdit = false;
  consultaId = '';
  ficha: FichaPaciente | null = null;
  /** Motivo y notas de la cita que originó la consulta (lo primero que lee el veterinario). */
  motivo = '';
  notas = '';

  constructor() {
    this.form = this.fb.group({
      mascotaId: ['', Validators.required],
      clienteId: ['', Validators.required],
      veterinarioId: ['', Validators.required],
      citaId: [''],
      fecha: [new Date(), Validators.required],
      sintomas: ['', Validators.required],
      temperatura: ['', [Validators.required, Validators.min(30), Validators.max(45)]],
      peso: ['', [Validators.required, Validators.min(0.1)]],
      diagnostico: ['', Validators.required],
      tratamiento: ['', Validators.required],
      observaciones: [''],
      tipo: ['cita']
    });
  }

  ngOnInit(): void {
    this.veterinarios = this.usuariosService.getVeterinarios();
    const user = this.auth.currentUser;
    if (user?.rol === 'veterinario') this.form.patchValue({ veterinarioId: user.id });

    this.consultaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.consultaId) {
      this.isEdit = true;
      const c = this.consultasService.getById(this.consultaId);
      if (c) {
        this.form.patchValue(c);
        this.cargarMascotaYCliente(c.mascotaId, c.clienteId, false);
        if (c.citaId) this.cargarMotivo(c.citaId);
      }
      return;
    }

    if (params.mascotaId) {
      this.form.patchValue({ mascotaId: params.mascotaId });
      this.cargarMascotaYCliente(params.mascotaId, params.clienteId);
    }
    if (params.clienteId) this.form.patchValue({ clienteId: params.clienteId });
    if (params.citaId) {
      const cita = this.citasService.getById(params.citaId);
      if (cita) {
        // B2: la cita NO se completa al abrir el formulario, sino al guardar la consulta.
        this.form.patchValue({ citaId: cita.id, tipo: cita.estado === 'inmediata' ? 'inmediata' : 'cita' });
        this.cargarMotivo(cita.id);
      }
    }
  }

  cargarMascotaYCliente(mascotaId: string, clienteId: string, sugerirPeso = true): void {
    this.mascota = this.mascotasService.getById(mascotaId) || null;
    this.cliente = this.clientesService.getById(clienteId) || null;
    if (!this.mascota) return;
    this.pesoAnterior = this.mascota.peso;
    if (sugerirPeso) this.form.patchValue({ peso: this.mascota.peso });
    this.ficha = fichaPaciente(this.mascota, this.cliente ?? undefined, this.consultasService.getAll(), this.vacunasService.getAll(), new Date(), this.consultaId || undefined);
  }

  private cargarMotivo(citaId: string): void {
    const cita = this.citasService.getById(citaId);
    this.motivo = cita?.motivo ?? '';
    this.notas = cita?.notas ?? '';
  }

  /** Peso registrado de la mascota antes de esta consulta. */
  pesoAnterior: number | null = null;

  /** "Normal en perros: 37.5–39.2 °C" (sin rango para reptiles y otros). */
  get rangoTexto(): string {
    const tipo = this.mascota?.tipo;
    const r = tipo ? RANGO_TEMPERATURA[tipo] : null;
    return r && tipo ? `Normal en ${tipo === 'Otro' ? 'esta especie' : tipo.toLowerCase() + 's'}: ${r[0]}–${r[1]} °C` : 'Rango normal según la especie';
  }

  get estadoTemperatura(): EstadoTemperatura | null {
    return this.mascota ? evaluarTemperatura(this.form.get('temperatura')?.value, this.mascota.tipo) : null;
  }

  get cambioDePeso(): string | null {
    return cambioPeso(this.form.get('peso')?.value, this.pesoAnterior);
  }

  /** Guarda la consulta y, si es nueva y viene de una cita, marca esa cita como completada. */
  private guardar(): Consulta {
    const data = this.form.value;
    if (this.isEdit) {
      this.consultasService.update(this.consultaId, data);
      return this.consultasService.getById(this.consultaId)!;
    }
    const consulta = this.consultasService.create(data);
    // El peso medido pasa a ser el peso actual de la mascota
    if (this.mascota && Number(data.peso) > 0 && Number(data.peso) !== this.mascota.peso) {
      this.mascotasService.update(this.mascota.id, { peso: Number(data.peso) });
    }
    if (consulta.citaId && this.citasService.getById(consulta.citaId)) {
      this.citasService.update(consulta.citaId, { estado: 'completada' });
    }
    return consulta;
  }

  onSubmit(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const consulta = this.guardar();
    this.snack.open(this.isEdit ? 'Consulta actualizada' : 'Consulta registrada', 'OK', { duration: 2000 });
    this.router.navigate(['/recetas/nueva'], { queryParams: { consultaId: consulta.id } });
  }

  guardarSinReceta(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    this.guardar();
    this.snack.open('Consulta guardada', 'OK', { duration: 2000 });
    this.router.navigate(['/consultas']);
  }
}
