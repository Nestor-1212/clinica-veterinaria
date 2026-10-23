import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { RecetasService } from '../../../core/services/recetas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Receta, Mascota, Cliente, Usuario, ItemReceta } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { enlaceWhatsApp } from '../../../core/utils/metricas';
import { EstadoTratamiento, estadoTratamiento, textoReceta } from '../../../core/utils/recetas';
import { DatePipe } from '@angular/common';

import { EdadPipe } from '../../../shared/pipes/edad.pipe';

@Component({
    selector: 'app-ver-receta',
    templateUrl: './ver-receta.component.html',
    styleUrls: ['./ver-receta.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe, EdadPipe]
})
export class VerRecetaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recetasService = inject(RecetasService);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private usuariosService = inject(UsuariosService);
  private pdfService = inject(PdfService);

  receta!: Receta;
  mascota!: Mascota;
  cliente!: Cliente;
  veterinario!: Usuario;
  dataSource = new MatTableDataSource<ItemReceta>();
  displayedColumns = ['medicamento', 'dosis', 'frecuencia', 'duracion', 'indicaciones'];

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const r = this.recetasService.getById(id);
    if (!r) { this.router.navigate(['/recetas']); return; }
    this.receta = r;
    this.mascota = this.mascotasService.getById(r.mascotaId)!;
    this.cliente = this.clientesService.getById(r.clienteId)!;
    this.veterinario = this.usuariosService.getById(r.veterinarioId)!;
    this.dataSource.data = r.items;
    this.tratamiento = estadoTratamiento(r, new Date());
    this.whatsapp = this.cliente ? enlaceWhatsApp(this.cliente.telefono, textoReceta(r, this.mascota, this.cliente.nombre)) : null;
  }

  tratamiento: EstadoTratamiento | null = null;
  whatsapp: string | null = null;

  get textoTratamiento(): string {
    const t = this.tratamiento;
    if (!t?.fin) return '';
    if (!t.enCurso) return 'Tratamiento terminado';
    return t.diasRestantes === 0 ? 'Tratamiento en curso · termina hoy' : `Tratamiento en curso · termina en ${t.diasRestantes} ${t.diasRestantes === 1 ? 'día' : 'días'}`;
  }

  async descargarPDF(): Promise<void> {
    await this.pdfService.generarReceta(this.receta, this.mascota, this.cliente, this.veterinario);
  }

  editar(): void { this.router.navigate(['/recetas/editar', this.receta.id]); }
}
