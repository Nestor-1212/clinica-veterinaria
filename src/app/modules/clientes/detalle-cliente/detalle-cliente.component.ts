import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { CitasService } from '../../../core/services/citas.service';
import { PagosService } from '../../../core/services/pagos.service';
import { Cliente, Mascota, Consulta, Cita, Pago } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-detalle-cliente',
  templateUrl: './detalle-cliente.component.html',
  styleUrls: ['./detalle-cliente.component.scss']
})
export class DetalleClienteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private citasService = inject(CitasService);
  private pagosService = inject(PagosService);

  cliente!: Cliente;
  mascotas: Mascota[] = [];
  consultas: Consulta[] = [];
  citas: Cita[] = [];
  pagos: Pago[] = [];
  selectedTab = 0;

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const c = this.clientesService.getById(id);
    if (!c) { this.router.navigate(['/clientes']); return; }
    this.cliente = c;
    this.mascotas = this.mascotasService.getByCliente(id);
    this.consultas = this.consultasService.getByCliente(id);
    this.citas = this.citasService.getByCliente(id);
    this.pagos = this.pagosService.getByCliente(id);
  }

  nuevaMascota(): void {
    this.router.navigate(['/mascotas/nueva'], { queryParams: { clienteId: this.cliente.id } });
  }

  nuevaCita(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.cliente.id } });
  }

  nuevaAtencion(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.cliente.id, tipo: 'inmediata' } });
  }

  verMascota(mascota: Mascota): void {
    this.router.navigate(['/mascotas', mascota.id]);
  }

  get totalPagado(): number {
    return this.pagos.filter(p => p.estado === 'pagado').reduce((a, p) => a + p.total, 0);
  }

  iconoEstadoCita(estado: string): string {
    const iconos: Record<string, string> = {
      pendiente: 'schedule', confirmada: 'check_circle', completada: 'done_all', cancelada: 'cancel', inmediata: 'flash_on'
    };
    return iconos[estado] || 'event';
  }

  iconoTipoConsulta(tipo: string): string { return tipo === 'inmediata' ? 'flash_on' : 'event'; }

  iconoEstadoPago(estado: string): string {
    const iconos: Record<string, string> = { pagado: 'check_circle', pendiente: 'schedule', anulado: 'cancel' };
    return iconos[estado] || 'payments';
  }
}
