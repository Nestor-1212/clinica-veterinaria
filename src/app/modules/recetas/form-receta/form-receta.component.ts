import { Component, OnInit, inject } from '@angular/core';
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
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError } from '@angular/material/input';
import { SlicePipe } from '@angular/common';

@Component({
    selector: 'app-form-receta',
    templateUrl: './form-receta.component.html',
    styleUrls: ['./form-receta.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatIconButton, MatTooltip, MatFormField, MatLabel, MatInput, MatSuffix, MatError, SlicePipe]
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  form: FormGroup;
  mascota: Mascota | null = null;
  cliente: Cliente | null = null;
  consulta: Consulta | null = null;
  isEdit = false;
  recetaId = '';

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
    const user = this.auth.currentUser;
    if (user) this.form.patchValue({ veterinarioId: user.id });

    this.recetaId = this.route.snapshot.params.id;
    const params = this.route.snapshot.queryParams;

    if (this.recetaId) {
      this.isEdit = true;
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

  agregarItem(): void { this.items.push(this.crearItem()); }
  removerItem(i: number): void { if (this.items.length > 1) this.items.removeAt(i); }

  onSubmit(): void {
    if (this.form.invalid) return;
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
    const user = this.auth.currentUser;
    const vet = user ? this.usuariosService.getById(user.id) : null;
    if (!vet) return;
    const receta = { ...this.form.value, id: this.recetaId || 'preview' };
    await this.pdfService.generarReceta(receta, this.mascota, this.cliente, vet);
  }
}
