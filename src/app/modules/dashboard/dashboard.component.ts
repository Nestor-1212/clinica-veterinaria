import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { CitasService } from '../../core/services/citas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { AuthService } from '../../core/services/auth.service';
import { Cita, Vacuna, Pago } from '../../core/models';

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
    vacunasPendientes: 0,
    vacunasVencidas: 0,
    montoPorCobrar: 0,
    pagosPendientesCount: 0
  };

  today = new Date();
  citasHoy: Cita[] = [];
  vacunasPendientes: Vacuna[] = [];
  pagosPendientes: Pago[] = [];

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

    const vacunas = this.vacunasService.getPendientes()
      .sort((a, b) => new Date(a.proximaFecha).getTime() - new Date(b.proximaFecha).getTime());
    this.vacunasPendientes = vacunas.slice(0, 5);
    this.stats.vacunasPendientes = vacunas.length;
    this.stats.vacunasVencidas = vacunas.filter(v => this.esVacunaVencida(v)).length;

    const pendientes = this.pagosService.getAll()
      .filter(p => p.estado === 'pendiente')
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    this.pagosPendientes = pendientes.slice(0, 5);
    this.stats.pagosPendientesCount = pendientes.length;
    this.stats.montoPorCobrar = pendientes.reduce((acc, p) => acc + p.total, 0);
  }

  esVacunaVencida(v: Vacuna): boolean {
    return new Date(v.proximaFecha) < this.today;
  }

  getClienteNombre(clienteId: string): string {
    return this.clientesService.getById(clienteId)?.nombre || 'Cliente';
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
