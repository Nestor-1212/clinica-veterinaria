import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { descuentoValido, subtotalLineas, totalPago } from '../../../core/utils/pagos';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Cliente, ItemPago, Mascota, MetodoPago } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatError, MatSuffix, MatInput, MatPrefix } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatDivider } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { DecimalPipe, TitleCasePipe } from '@angular/common';

@Component({
    selector: 'app-form-pago',
    templateUrl: './form-pago.component.html',
    styleUrls: ['./form-pago.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatError, MatSuffix, MatInput, MatDatepickerInput, MatDatepickerToggle, MatDatepicker, MatDivider, MatPrefix, MatIconButton, MatTooltip, DecimalPipe, TitleCasePipe]
})
export class FormPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pagosService = inject(PagosService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private pdfService = inject(PdfService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  cliente: Cliente | null = null;
  metodosPago: MetodoPago[] = ['efectivo', 'tarjeta', 'yappy', 'transferencia'];
  categorias = ['consulta', 'medicamento', 'vacuna', 'cirugia', 'examen', 'otro'];

  constructor() {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      mascotaId: ['', Validators.required],
      consultaId: [''],
      fecha: [new Date()],
      items: this.fb.array([this.crearItem()]),
      descuento: [0, [Validators.min(0), (c: AbstractControl) => this.validarDescuento(c)]],
      metodoPago: ['efectivo', Validators.required],
      estado: ['pagado'],
      referencia: [''],
      notas: ['']
    });
    // B10: si cambian los ítems, el subtotal cambia y hay que revalidar el descuento.
    this.items.valueChanges.subscribe(() => this.revalidarDescuento());
  }

  ngOnInit(): void {
    this.clientes = this.clientesService.getAll().filter(c => c.activo);
    const params = this.route.snapshot.queryParams;
    if (params.clienteId) {
      this.form.patchValue({ clienteId: params.clienteId });
      this.onClienteChange(params.clienteId);
    }
    if (params.mascotaId) this.form.patchValue({ mascotaId: params.mascotaId });
    if (params.consultaId) this.form.patchValue({ consultaId: params.consultaId });
  }

  onClienteChange(id: string): void {
    this.mascotas = this.mascotasService.getByCliente(id);
    this.cliente = this.clientesService.getById(id) || null;
    if (this.mascotas.length === 1) this.form.patchValue({ mascotaId: this.mascotas[0].id });
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  crearItem(data?: Partial<ItemPago>): FormGroup {
    return this.fb.group({
      descripcion: [data?.descripcion || '', Validators.required],
      categoria: [data?.categoria || 'consulta', Validators.required],
      cantidad: [data?.cantidad || 1, [Validators.required, Validators.min(1)]],
      precioUnitario: [data?.precioUnitario || 0, [Validators.required, Validators.min(0)]],
      subtotal: [{ value: data?.subtotal || 0, disabled: true }]
    });
  }

  agregarItem(): void { this.items.push(this.crearItem()); }
  removerItem(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
    this.revalidarDescuento();
  }

  /** B10: el descuento no puede superar el subtotal de los ítems. */
  private validarDescuento(c: AbstractControl): ValidationErrors | null {
    if (!this.form) return null; // durante la construcción del formulario
    return descuentoValido(this.subtotal, c.value) ? null : { descuentoMayorQueSubtotal: true };
  }

  private revalidarDescuento(): void {
    this.form.get('descuento')?.updateValueAndValidity();
  }

  calcularSubtotal(i: number): void {
    const item = this.items.at(i);
    const sub = (item.get('cantidad')?.value || 0) * (item.get('precioUnitario')?.value || 0);
    item.patchValue({ subtotal: sub });
    this.revalidarDescuento();
  }

  get subtotal(): number {
    return subtotalLineas(this.items.controls.map(item => item.getRawValue()));
  }

  /** Total mostrado en pantalla (nunca negativo mientras el descuento es inválido). */
  get total(): number { return Math.max(0, this.subtotal - (this.form.get('descuento')?.value || 0)); }

  onSubmit(): void {
    this.revalidarDescuento();
    if (this.form.invalid) return;
    const rawItems = this.items.controls.map(c => ({
      ...c.value,
      subtotal: (c.get('cantidad')?.value || 0) * (c.get('precioUnitario')?.value || 0)
    }));
    const data = {
      ...this.form.value,
      items: rawItems,
      descuento: Number(this.form.value.descuento) || 0,
      subtotal: this.subtotal,
      total: totalPago(this.subtotal, this.form.value.descuento)
    };
    this.pagosService.create(data);
    this.snack.open('Pago registrado', 'OK', { duration: 2000 });
    this.router.navigate(['/pagos']);
  }
}
