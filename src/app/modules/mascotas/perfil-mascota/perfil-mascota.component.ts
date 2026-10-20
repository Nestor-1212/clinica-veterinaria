import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { ExamenesService } from '../../../core/services/examenes.service';
import { RecetasService } from '../../../core/services/recetas.service';
import { Mascota, Cliente, Consulta, Vacuna, Examen, Receta } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-perfil-mascota',
  templateUrl: './perfil-mascota.component.html',
  styleUrls: ['./perfil-mascota.component.scss']
})
export class PerfilMascotaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private examenesService = inject(ExamenesService);
  private recetasService = inject(RecetasService);

  mascota!: Mascota;
  cliente!: Cliente;
  consultas: Consulta[] = [];
  vacunas: Vacuna[] = [];
  examenes: Examen[] = [];
  recetas: Receta[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const m = this.mascotasService.getById(id);
    if (!m) { this.router.navigate(['/mascotas']); return; }
    this.mascota = m;
    const c = this.clientesService.getById(m.clienteId);
    if (c) this.cliente = c;
    this.consultas = this.consultasService.getByMascota(id);
    this.vacunas = this.vacunasService.getByMascota(id);
    this.examenes = this.examenesService.getByMascota(id);
    this.recetas = this.recetasService.getByMascota(id);
  }

  nuevaConsulta(): void {
    this.router.navigate(['/consultas/nueva'], { queryParams: { mascotaId: this.mascota.id, clienteId: this.mascota.clienteId } });
  }

  nuevaVacuna(): void {
    this.router.navigate(['/vacunas/nueva'], { queryParams: { mascotaId: this.mascota.id } });
  }

  nuevoExamen(): void {
    this.router.navigate(['/examenes/nuevo'], { queryParams: { mascotaId: this.mascota.id } });
  }

  iconoTipoConsulta(tipo: string): string { return tipo === 'inmediata' ? 'flash_on' : 'event'; }
}
