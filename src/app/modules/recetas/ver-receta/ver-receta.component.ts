import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { RecetasService } from '../../../core/services/recetas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Receta, Mascota, Cliente, Usuario } from '../../../core/models';

@Component({
  selector: 'app-ver-receta',
  templateUrl: './ver-receta.component.html',
  styleUrls: ['./ver-receta.component.scss']
})
export class VerRecetaComponent implements OnInit {
  receta!: Receta;
  mascota!: Mascota;
  cliente!: Cliente;
  veterinario!: Usuario;
  dataSource = new MatTableDataSource<any>();
  displayedColumns = ['medicamento', 'dosis', 'frecuencia', 'duracion', 'indicaciones'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recetasService: RecetasService,
    private mascotasService: MascotasService,
    private clientesService: ClientesService,
    private usuariosService: UsuariosService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const r = this.recetasService.getById(id);
    if (!r) { this.router.navigate(['/recetas']); return; }
    this.receta = r;
    this.mascota = this.mascotasService.getById(r.mascotaId)!;
    this.cliente = this.clientesService.getById(r.clienteId)!;
    this.veterinario = this.usuariosService.getById(r.veterinarioId)!;
    this.dataSource.data = r.items;
  }

  async descargarPDF(): Promise<void> {
    await this.pdfService.generarReceta(this.receta, this.mascota, this.cliente, this.veterinario);
  }

  editar(): void { this.router.navigate(['/recetas/editar', this.receta.id]); }
}
