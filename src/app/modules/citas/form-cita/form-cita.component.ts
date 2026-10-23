import { Component, OnInit, inject, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { habilitarSi, validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService } from '../../../core/services/citas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Cliente, Mascota, Usuario } from '../../../core/models';
import { DisponibilidadVet, Horario, MOTIVOS_FRECUENTES, MOTIVOS_PROGRAMADOS, agregarMotivo, citasDelDia, disponibilidadVeterinarios, horariosDelDia } from '../../../core/utils/atencion';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix, MatError, MatInput } from '@angular/material/input';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatCalendar } from '@angular/material/datepicker';

@Component({
    selector: 'app-form-cita',
    templateUrl: './form-cita.component.html',
    styleUrls: ['./form-cita.component.scss', './atencion-inmediata.scss'],
    imports: [MatIcon, MatButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatSuffix, MatError, MatInput, MatCalendar, DatePipe, NgTemplateOutlet, EdadPipe, FichaPacienteComponent]
})
export class FormCitaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private citasService = inject(CitasService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private usuariosService = inject(UsuariosService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  veterinarios: Usuario[] = [];
  isInmediata = false;
  horas = this.generarHoras();
  /** Momento de llegada de la atención inmediata (se fija de nuevo al enviar). */
  llegada = new Date();
  /** Volver al expediente si se llegó desde un cliente; si no, a Citas. */
  volverA: string[] = ['/citas'];

  readonly iconoEspecie = ICONO_ESPECIE;
  /** Primer día que se puede agendar. */
  readonly hoy = inicioDelDia(new Date());
  /** Tramos del día elegido para el veterinario elegido (solo cita programada). */
  horarios: Horario[] = [];
  /** Citas vigentes de cada veterinario el día elegido. */
  citasPorVet: Record<string, number> = {};
  /** Veterinarios ordenados por disponibilidad ahora (solo atención inmediata). */
  disponibilidad: DisponibilidadVet[] = [];
  ficha: FichaPaciente | null = null;

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      // Se habilita al elegir propietario (onClienteChange); antes era [disabled] en la plantilla
      mascotaId: [{ value: '', disabled: true }, Validators.required],
      veterinarioId: ['', Validators.required],
      fecha: [inicioDelDia(new Date()), Validators.required],
      hora: ['', Validators.required],
      motivo: ['', Validators.required],
      estado: ['pendiente'],
      notas: ['']
    });
    this.form.get('mascotaId')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.actualizarFicha(id));
    for (const campo of ['fecha', 'veterinarioId']) {
      this.form.get(campo)!.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => { if (!this.isInmediata) this.actualizarAgenda(); });
    }
  }

  get motivos(): readonly string[] {
    return this.isInmediata ? MOTIVOS_FRECUENTES : MOTIVOS_PROGRAMADOS;
  }

  // Las horas que ya pasaron hoy no se muestran; las ocupadas sí (tachadas), para ver la agenda
  get horariosManana(): Horario[] { return this.horarios.filter(h => h.estado !== 'pasada' && h.hora < '12:00'); }
  get horariosTarde(): Horario[] { return this.horarios.filter(h => h.estado !== 'pasada' && h.hora >= '12:00'); }
  get libresDelDia(): number { return this.horarios.filter(h => h.estado === 'libre').length; }

  elegirFecha(fecha: Date | null): void {
    if (fecha) this.form.patchValue({ fecha: inicioDelDia(fecha) });
  }

  elegirHora(h: Horario): void {
    if (h.estado !== 'libre') return;
    this.form.patchValue({ hora: h.hora });
    this.form.get('hora')!.markAsTouched();
  }

  /** Recalcula horas libres y carga de cada veterinario al cambiar el día o el veterinario. */
  private actualizarAgenda(): void {
    const { fecha, veterinarioId, hora } = this.form.getRawValue();
    const dia = new Date(fecha);
    const citas = this.citasService.getAll();
    this.horarios = horariosDelDia(this.horas, citas, veterinarioId, dia, new Date());
    this.citasPorVet = Object.fromEntries(this.veterinarios.map(v => [v.id, citasDelDia(citas, v.id, dia).length]));
    // La hora elegida ya no sirve (ocupada o pasada): se pide otra
    if (hora && this.horarios.find(h => h.hora === hora)?.estado !== 'libre') this.form.patchValue({ hora: '' }, { emitEvent: false });
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    this.veterinarios = this.usuariosService.getVeterinarios();

    const params = this.route.snapshot.queryParams;
    if (params.tipo === 'inmediata') {
      this.isInmediata = true;
      this.llegada = new Date();
      this.form.patchValue({ estado: 'inmediata', fecha: this.llegada, hora: horaDe(this.llegada) });
      this.disponibilidad = disponibilidadVeterinarios(this.veterinarios, this.citasService.getAll(), this.llegada);
      // Si quien registra es veterinario, lo atiende él por defecto
      const yo = this.auth.currentUser;
      if (yo?.rol === 'veterinario' && this.veterinarios.some(v => v.id === yo.id)) this.form.patchValue({ veterinarioId: yo.id });
    } else {
      // Desde un hueco libre de la agenda llegan veterinario, día y hora
      if (this.veterinarios.some(v => v.id === params.veterinarioId)) this.form.patchValue({ veterinarioId: params.veterinarioId }, { emitEvent: false });
      const fecha = params.fecha ? new Date(`${params.fecha}T00:00`) : null;
      if (fecha && !isNaN(fecha.getTime()) && fecha >= this.hoy) this.form.patchValue({ fecha }, { emitEvent: false });
      this.actualizarAgenda();
      if (params.hora && this.horarios.find(h => h.hora === params.hora)?.estado === 'libre') this.form.patchValue({ hora: params.hora });
    }
    if (params.clienteId) {
      this.form.patchValue({ clienteId: params.clienteId });
      this.onClienteChange(params.clienteId);
      // Desde la lista de Mascotas llega también la mascota
      if (this.mascotas.some(m => m.id === params.mascotaId)) this.form.patchValue({ mascotaId: params.mascotaId });
      this.volverA = params.mascotaId ? ['/mascotas'] : ['/clientes', params.clienteId];
    }
  }

  /** Mascota elegida: para avisar de sus alergias antes de atenderla. */
  get mascotaSeleccionada(): Mascota | undefined {
    const id = this.form.get('mascotaId')?.value;
    return id ? this.mascotas.find(m => m.id === id) : undefined;
  }

  onClienteChange(clienteId: string): void {
    habilitarSi(this.form.get('mascotaId'), !!clienteId);
    this.mascotas = this.mascotasService.getByCliente(clienteId).filter(m => m.activo);
    const unica = this.mascotas.length === 1 ? this.mascotas[0].id : '';
    this.form.patchValue({ mascotaId: unica });
  }

  /** Suma un motivo frecuente al texto (sin repetirlo) para luego detallarlo. */
  usarMotivo(motivo: string): void {
    const control = this.form.get('motivo')!;
    control.setValue(agregarMotivo(control.value, motivo));
    control.markAsTouched();
  }

  motivoIncluido(motivo: string): boolean {
    const texto = (this.form.get('motivo')?.value || '').toLowerCase();
    return texto.split(',').map((p: string) => p.trim()).includes(motivo.toLowerCase());
  }

  onSubmit(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    if (this.isInmediata) {
      // La llegada real es el momento de registrar, no el de abrir el formulario
      this.llegada = new Date();
      this.form.patchValue({ fecha: this.llegada, hora: horaDe(this.llegada) });
    }
    const cita = this.citasService.create(this.form.value);
    if (!this.isInmediata) {
      this.snack.open('Cita programada', 'OK', { duration: 2000 });
      this.router.navigate(['/citas']);
      return;
    }
    // B1: la consulta recibe el citaId para quedar vinculada (tipo 'inmediata') y cerrar la cita al guardarse.
    if (puedeAcceder(this.auth.currentUser?.rol, 'consultas')) {
      this.snack.open('¡Atención inmediata registrada!', 'OK', { duration: 2000 });
      this.router.navigate(['/consultas/nueva'], {
        queryParams: { citaId: cita.id, mascotaId: cita.mascotaId, clienteId: cita.clienteId }
      });
    } else {
      // Recepción no tiene acceso a Consultas: el veterinario la iniciará desde Citas.
      this.snack.open('Atención inmediata registrada. El veterinario iniciará la consulta desde Citas.', 'OK', { duration: 4000 });
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

  private actualizarFicha(mascotaId: string): void {
    const mascota = this.mascotas.find(m => m.id === mascotaId);
    this.ficha = mascota
      ? fichaPaciente(mascota, this.clientes.find(c => c.id === mascota.clienteId), this.consultasService.getAll(), this.vacunasService.getAll(), new Date())
      : null;
  }

}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** "HH:mm" de una fecha (la hora real de llegada, no un tramo de media hora). */
function horaDe(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}
