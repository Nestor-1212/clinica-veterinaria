import { Component, OnInit, inject } from '@angular/core';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { CitasService } from '../../core/services/citas.service';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardAvatar } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { DecimalPipe, TitleCasePipe, DatePipe } from '@angular/common';

interface ReporteMes {
  mes: string;
  consultas: number;
  ingresos: number;
}

@Component({
    selector: 'app-reportes',
    templateUrl: './reportes.component.html',
    styleUrls: ['./reportes.component.scss'],
    imports: [MatIcon, MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatProgressBar, MatCardAvatar, MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine, DecimalPipe, TitleCasePipe, DatePipe]
})
export class ReportesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private pagosService = inject(PagosService);
  private citasService = inject(CitasService);

  stats = { clientes: 0, mascotas: 0, consultasTotal: 0, consultasMes: 0, ingresosMes: 0, ingresosTotal: 0, vacunasPendientes: 0 };
  vacunasPendientesList: any[] = [];
  consultasPorTipo: any[] = [];
  pagosPorMetodo: any[] = [];
  reporteMensual: ReporteMes[] = [];
  meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  ngOnInit(): void {
    const now = new Date();
    this.stats.clientes = this.clientesService.getAll().filter(c => c.activo).length;
    this.stats.mascotas = this.mascotasService.getAll().filter(m => m.activo).length;
    this.stats.consultasTotal = this.consultasService.getAll().length;
    this.stats.consultasMes = this.consultasService.getAll().filter(c => {
      const f = new Date(c.fecha);
      return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
    }).length;
    this.stats.ingresosMes = this.pagosService.getTotalMes();
    this.stats.ingresosTotal = this.pagosService.getAll().filter(p => p.estado === 'pagado').reduce((a, p) => a + p.total, 0);
    this.stats.vacunasPendientes = this.vacunasService.getPendientes().length;
    this.vacunasPendientesList = this.vacunasService.getPendientes().slice(0, 10);

    const consultas = this.consultasService.getAll();
    const citas = consultas.filter(c => c.tipo === 'cita').length;
    const inmediatas = consultas.filter(c => c.tipo === 'inmediata').length;
    this.consultasPorTipo = [
      { tipo: 'Cita programada', cantidad: citas, color: '#1976d2' },
      { tipo: 'Atención inmediata', cantidad: inmediatas, color: '#f44336' }
    ];

    const pagos = this.pagosService.getAll();
    const metodos: any = {};
    pagos.forEach(p => { metodos[p.metodoPago] = (metodos[p.metodoPago] || 0) + 1; });
    this.pagosPorMetodo = Object.keys(metodos).map(k => ({ metodo: k, cantidad: metodos[k] }));

    this.reporteMensual = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mes = this.meses[d.getMonth()];
      const consultasM = consultas.filter(c => {
        const f = new Date(c.fecha);
        return f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear();
      }).length;
      const ingresosM = pagos.filter(p => {
        const f = new Date(p.fecha);
        return f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear() && p.estado === 'pagado';
      }).reduce((a, p) => a + p.total, 0);
      return { mes, consultas: consultasM, ingresos: ingresosM };
    });
  }

  get maxConsultas(): number { return Math.max(...this.reporteMensual.map(r => r.consultas), 1); }
  get maxIngresos(): number { return Math.max(...this.reporteMensual.map(r => r.ingresos), 1); }
  get pagosTotal(): number { return this.pagosPorMetodo.reduce((a, p) => a + p.cantidad, 0) || 1; }
}
