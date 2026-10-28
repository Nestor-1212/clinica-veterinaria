import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { lineasDeAtencion, CATEGORIA_TEXTO, METODO_ICONO, METODO_TEXTO, ServicioFrecuente, descuentoValido, serviciosFrecuentes, subtotalLineas, totalPago } from '../../../core/utils/pagos';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { ExamenesService } from '../../../core/services/examenes.service';
import { Cliente, Consulta, ItemPago, Mascota, MetodoPago } from '../../../core/models';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatInput, MatHint } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SelectorPacienteComponent } from '../../../shared/components/selector-paciente/selector-paciente.component';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { ResumenErroresComponent } from '../../../shared/components/resumen-errores/resumen-errores.component';

/** Cobrar ahora (con el método con que paga) o dejarlo pendiente: se elige siempre, no hay valor por defecto. */
export type ModoCobro = 'cobrar' | 'pendiente';

@Component({
  selector: 'app-form-pago',
  templateUrl: './form-pago.component.html',
  styleUrls: ['./form-pago.component.scss'],
  imports: [ResumenErroresComponent, MatIcon, MatButton, MatIconButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatInput, MatHint, MatTooltip, DecimalPipe, DatePipe, SelectorPacienteComponent, FichaPacienteComponent]
})
export class FormPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pagosService = inject(PagosService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private examenesService = inject(ExamenesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private host = inject(ElementRef, { optional: true });

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  mascota: Mascota | null = null;
  ficha: FichaPaciente | null = null;
  frecuentes: ServicioFrecuente[] = [];
  volverA: unknown[] = ['/pagos'];
  /** Consulta de la que viene este cobro (las líneas llegan sugeridas). */
  consultaOrigen: Consulta | null = null;

  readonly metodosPago = Object.keys(METODO_TEXTO) as MetodoPago[];
  readonly METODO_TEXTO = METODO_TEXTO;
  readonly METODO_ICONO = METODO_ICONO;
  readonly CATEGORIA_TEXTO = CATEGORIA_TEXTO;
  readonly categorias = Object.keys(CATEGORIA_TEXTO) as ItemPago['categoria'][];

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      mascotaId: ['', Validators.required],
      consultaId: [''],
      items: this.fb.array([this.crearItem()]),
      descuento: [0, [Validators.min(0), (c: AbstractControl) => this.validarDescuento(c)]],
      modo: [null as ModoCobro | null, Validators.required],
      // Obligatorio solo al cobrar ahora (ver elegirModo)
      metodoPago: [null as MetodoPago | null],
      referencia: [''],
      notas: ['']
    });
    // B10: si cambian los ítems, el subtotal cambia y hay que revalidar el descuento.
    this.items.valueChanges.subscribe(() => this.revalidarDescuento());
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    const activos = new Set(this.clientes.map(c => c.id));
    this.mascotas = this.mascotasService.getAll().filter(m => m.activo !== false && activos.has(m.clienteId));
    this.frecuentes = serviciosFrecuentes(this.pagosService.getAll());

    const params = this.route.snapshot.queryParams;
    if (params.mascotaId) {
      this.onMascotaChange(params.mascotaId);
      this.volverA = ['/mascotas', params.mascotaId];
    } else if (params.clienteId) {
      // Desde la ficha del cliente: si tiene una sola mascota, ya queda elegida
      const suyas = this.mascotas.filter(m => m.clienteId === params.clienteId);
      this.form.patchValue({ clienteId: params.clienteId });
      if (suyas.length === 1) this.onMascotaChange(suyas[0].id);
      this.volverA = ['/clientes', params.clienteId];
    }
    if (params.consultaId) this.desdeConsulta(params.consultaId);
  }

  /** Cobrar una atención: paciente, consulta, recargo e insumos de laboratorio ya cargados con su último precio. */
  private desdeConsulta(id: string): void {
    const c = this.consultasService.getById(id);
    if (!c) return;
    this.consultaOrigen = c;
    this.form.patchValue({ consultaId: c.id });
    this.onMascotaChange(c.mascotaId);
    this.items.clear();
    for (const l of lineasDeAtencion(c, this.examenesService.getAll(), serviciosFrecuentes(this.pagosService.getAll(), 200))) {
      this.items.push(this.crearItem({ descripcion: l.descripcion, categoria: l.categoria, cantidad: 1, precioUnitario: l.precio ?? undefined }));
    }
    this.volverA = ['/pagos'];
  }

  onMascotaChange(id: string): void {
    this.mascota = id ? this.mascotasService.getById(id) || null : null;
    const cliente = this.mascota ? this.clientesService.getById(this.mascota.clienteId) : undefined;
    this.form.patchValue({ mascotaId: id, clienteId: this.mascota?.clienteId ?? '' });
    this.ficha = this.mascota
      ? fichaPaciente(this.mascota, cliente, this.consultasService.getAll(), this.vacunasService.getAll(), new Date())
      : null;
  }

  get nombreCliente(): string {
    return this.clientes.find(c => c.id === this.form.value.clienteId)?.nombre ?? '';
  }

  get pacienteInvalido(): boolean {
    const c = this.form.get('mascotaId')!;
    return c.invalid && c.touched;
  }

  // ---------- Servicios ----------

  get items(): FormArray { return this.form.get('items') as FormArray; }

  crearItem(data?: Partial<ItemPago>): FormGroup {
    return this.fb.group({
      descripcion: [data?.descripcion || '', Validators.required],
      categoria: [data?.categoria || 'consulta', Validators.required],
      cantidad: [data?.cantidad || 1, [Validators.required, Validators.min(1)]],
      precioUnitario: [data?.precioUnitario ?? null, [Validators.required, Validators.min(0)]]
    });
  }

  agregarItem(): void { this.items.push(this.crearItem()); }

  /** Un toque agrega el servicio con su precio habitual (o llena la primera línea si está vacía). */
  agregarFrecuente(s: ServicioFrecuente): void {
    const datos = { descripcion: s.descripcion, categoria: s.categoria, cantidad: 1, precioUnitario: s.precio };
    const vacia = this.items.controls.find(c => !c.value.descripcion && !c.value.precioUnitario);
    if (vacia) vacia.patchValue(datos); else this.items.push(this.crearItem(datos));
  }

  removerItem(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
    this.revalidarDescuento();
  }

  subtotalDe(i: number): number {
    const v = this.items.at(i).value;
    return (Number(v.cantidad) || 0) * (Number(v.precioUnitario) || 0);
  }

  /** B10: el descuento no puede superar el subtotal de los ítems. */
  private validarDescuento(c: AbstractControl): ValidationErrors | null {
    if (!this.form) return null; // durante la construcción del formulario
    return descuentoValido(this.subtotal, c.value) ? null : { descuentoMayorQueSubtotal: true };
  }

  private revalidarDescuento(): void {
    this.form.get('descuento')?.updateValueAndValidity({ emitEvent: false });
  }

  get subtotal(): number {
    return subtotalLineas(this.items.controls.map(item => item.getRawValue()));
  }

  /** Total mostrado en pantalla (nunca negativo mientras el descuento es inválido). */
  get total(): number { return Math.max(0, this.subtotal - (Number(this.form.get('descuento')?.value) || 0)); }

  // ---------- Pago ----------

  get modo(): ModoCobro | null { return this.form.value.modo; }

  elegirModo(m: ModoCobro): void {
    this.form.patchValue({ modo: m });
    const metodo = this.form.get('metodoPago')!;
    metodo.setValidators(m === 'cobrar' ? Validators.required : null);
    if (m === 'pendiente') this.form.patchValue({ metodoPago: null, referencia: '' });
    metodo.updateValueAndValidity();
  }

  /** Los dos modos como grupo de radio: las flechas cambian la elección. */
  navegarModo(ev: KeyboardEvent): void {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(ev.key)) return;
    ev.preventDefault();
    const sig: ModoCobro = this.modo === 'cobrar' ? 'pendiente' : 'cobrar';
    this.elegirModo(sig);
    (ev.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-modo="${sig}"]`)?.focus();
  }

  elegirMetodo(m: MetodoPago): void { this.form.patchValue({ metodoPago: m }); }

  /** Métodos como grupo de radio: flechas para moverse, como en el panel de cobro. */
  navegarMetodos(ev: KeyboardEvent, actual: MetodoPago): void {
    const paso = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[ev.key];
    if (!paso) return;
    ev.preventDefault();
    const n = this.metodosPago.length;
    const sig = this.metodosPago[(this.metodosPago.indexOf(actual) + paso + n) % n];
    this.elegirMetodo(sig);
    (ev.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-metodo="${sig}"]`)?.focus();
  }

  get etiquetaReferencia(): string {
    return ({ yappy: 'Confirmación de Yappy (opcional)', transferencia: 'Número de la transferencia (opcional)', tarjeta: 'Últimos 4 dígitos o voucher (opcional)', efectivo: '' } as Record<MetodoPago, string>)[this.form.value.metodoPago as MetodoPago] ?? '';
  }

  get textoBoton(): string {
    const monto = '$' + this.total.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return this.modo === 'pendiente' ? `Dejar pendiente ${monto}` : this.modo === 'cobrar' ? `Cobrar ${monto}` : 'Registrar cobro';
  }

  onSubmit(): void {
    this.revalidarDescuento();
    if (this.enviando) return;
    if (this.form.get('mascotaId')!.invalid) {
      this.form.markAllAsTouched();
      this.host?.nativeElement.querySelector('#selector-paciente')?.focus();
      return;
    }
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) {
      // Los grupos de botones no son campos: llevar el foco a la elección que falta
      const falta = this.form.get('modo')!.invalid ? '.modo' : this.form.get('metodoPago')!.invalid ? '.metodo' : '';
      if (falta && !this.items.invalid && !this.form.get('descuento')!.invalid) this.host?.nativeElement.querySelector(falta)?.focus();
      return;
    }
    this.enviando = true;
    const v = this.form.value;
    const items: ItemPago[] = this.items.controls.map(c => ({
      descripcion: c.value.descripcion.trim(),
      categoria: c.value.categoria,
      cantidad: Number(c.value.cantidad),
      precioUnitario: Number(c.value.precioUnitario),
      subtotal: (Number(c.value.cantidad) || 0) * (Number(c.value.precioUnitario) || 0)
    }));
    const cobrar = v.modo === 'cobrar';
    const ahora = new Date();
    this.pagosService.create({
      clienteId: v.clienteId,
      mascotaId: v.mascotaId,
      consultaId: v.consultaId || undefined,
      fecha: ahora,
      items,
      descuento: Number(v.descuento) || 0,
      subtotal: this.subtotal,
      total: totalPago(this.subtotal, v.descuento),
      // Pendiente: el método real se elige al cobrar (la lista muestra "—" mientras tanto)
      metodoPago: cobrar ? v.metodoPago : 'efectivo',
      estado: cobrar ? 'pagado' : 'pendiente',
      ...(cobrar ? { fechaPago: ahora, referencia: v.referencia?.trim() || undefined } : {}),
      notas: v.notas?.trim() || undefined
    });
    this.snack.open(cobrar ? `Cobro registrado: ${this.textoBoton.replace('Cobrar ', '')}` : 'Cobro pendiente registrado', undefined, { duration: 2500, panelClass: 'snack-centro' });
    this.router.navigate(['/pagos']);
  }
}
