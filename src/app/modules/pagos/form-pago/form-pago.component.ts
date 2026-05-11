import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Cliente, Mascota, MetodoPago } from '../../../core/models';

@Component({
  selector: 'app-form-pago',
  templateUrl: './form-pago.component.html',
  styleUrls: ['./form-pago.component.scss']
})
export class FormPagoComponent implements OnInit {
  form: FormGroup;
  clientes: Cliente[] = [];
  mascotas: Mascota[] = [];
  cliente: Cliente | null = null;
  metodosPago: MetodoPago[] = ['efectivo', 'tarjeta', 'yappy', 'transferencia'];
  categorias = ['consulta', 'medicamento', 'vacuna', 'cirugia', 'examen', 'otro'];

  constructor(
    private fb: FormBuilder,
    private pagosService: PagosService,
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private pdfService: PdfService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      clienteId: ['', Validators.required],
      mascotaId: ['', Validators.required],
      consultaId: [''],
      fecha: [new Date()],
      items: this.fb.array([this.crearItem()]),
      descuento: [0, [Validators.min(0)]],
      metodoPago: ['efectivo', Validators.required],
      estado: ['pagado'],
      referencia: [''],
      notas: ['']
    });
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

  crearItem(data?: any): FormGroup {
    return this.fb.group({
      descripcion: [data?.descripcion || '', Validators.required],
      categoria: [data?.categoria || 'consulta', Validators.required],
      cantidad: [data?.cantidad || 1, [Validators.required, Validators.min(1)]],
      precioUnitario: [data?.precioUnitario || 0, [Validators.required, Validators.min(0)]],
      subtotal: [{ value: data?.subtotal || 0, disabled: true }]
    });
  }

  agregarItem(): void { this.items.push(this.crearItem()); }
  removerItem(i: number): void { if (this.items.length > 1) this.items.removeAt(i); }

  calcularSubtotal(i: number): void {
    const item = this.items.at(i);
    const sub = (item.get('cantidad')?.value || 0) * (item.get('precioUnitario')?.value || 0);
    item.patchValue({ subtotal: sub });
  }

  get subtotal(): number {
    return this.items.controls.reduce((acc, item) => {
      return acc + (item.get('cantidad')?.value || 0) * (item.get('precioUnitario')?.value || 0);
    }, 0);
  }

  get total(): number { return Math.max(0, this.subtotal - (this.form.get('descuento')?.value || 0)); }

  onSubmit(): void {
    if (this.form.invalid) return;
    const rawItems = this.items.controls.map(c => ({
      ...c.value,
      subtotal: (c.get('cantidad')?.value || 0) * (c.get('precioUnitario')?.value || 0)
    }));
    const data = {
      ...this.form.value,
      items: rawItems,
      subtotal: this.subtotal,
      total: this.total
    };
    const pago = this.pagosService.create(data);
    this.snack.open('Pago registrado', 'OK', { duration: 2000 });
    this.router.navigate(['/pagos']);
  }
}
