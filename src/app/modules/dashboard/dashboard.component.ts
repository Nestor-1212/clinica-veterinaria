import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { CitasService } from '../../core/services/citas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { AuthService } from '../../core/services/auth.service';
import { Cita, Vacuna } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    clientes: 0,
    mascotas: 0,
    citasHoy: 0,
    consultasHoy: 0,
    ingresosMes: 0,
    vacunasPendientes: 0
  };

  today = new Date();
  citasHoy: Cita[] = [];
  vacunasPendientes: Vacuna[] = [];

  get userName(): string {
    const u = this.auth.currentUser;
    return u ? u.nombre : '';
  }

  constructor(
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private citasService: CitasService,
    private consultasService: ConsultasService,
    private vacunasService: VacunasService,
    private pagosService: PagosService,
    public auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.stats.clientes = this.clientesService.getAll().filter(c => c.activo).length;
    this.stats.mascotas = this.mascotasService.getAll().filter(m => m.activo).length;
    this.stats.citasHoy = this.citasService.getHoy().length;
    this.stats.consultasHoy = this.consultasService.getHoy().length;
    this.stats.ingresosMes = this.pagosService.getTotalMes();
    this.citasHoy = this.citasService.getHoy().slice(0, 5);
    this.vacunasPendientes = this.vacunasService.getPendientes().slice(0, 5);
    this.stats.vacunasPendientes = this.vacunasService.getPendientes().length;
  }

  nuevaAtencionInmediata(): void {
    this.router.navigate(['/clientes'], { queryParams: { accion: 'atencion' } });
  }

  nuevaCita(): void {
    this.router.navigate(['/citas/nueva']);
  }

  nuevoCliente(): void {
    this.router.navigate(['/clientes/nuevo']);
  }
}
