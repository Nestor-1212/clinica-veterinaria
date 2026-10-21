import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { CitasService } from '../../core/services/citas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { AuthService } from '../../core/services/auth.service';
import { Cita, Vacuna, Pago } from '../../core/models';
import { Seccion, puedeAcceder } from '../../core/auth/permisos';
import { estadoRecordatorio } from '../../core/utils/vacunas';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent, MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle } from '@angular/material/card';
import { MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { MatChip } from '@angular/material/chips';
import { DecimalPipe, TitleCasePipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [MatButton, MatIcon, MatCard, RouterLink, MatCardContent, MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatChip, MatListItemLine, DecimalPipe, TitleCasePipe, DatePipe]
})
export class DashboardComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private citasService = inject(CitasService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private pagosService = inject(PagosService);
  auth = inject(AuthService);
  private router = inject(Router);

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

  /** Oculta métricas y paneles que enlazan a secciones sin permiso para el rol actual. */
  puede(seccion: Seccion): boolean {
    return puedeAcceder(this.auth.currentUser?.rol, seccion);
  }

  esVacunaVencida(v: Vacuna): boolean {
    return estadoRecordatorio(v, this.today) === 'vencida';
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
