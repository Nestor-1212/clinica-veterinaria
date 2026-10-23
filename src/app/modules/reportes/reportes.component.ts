import { Component, OnInit, inject } from '@angular/core';
import { ClientesService } from '../../core/services/clientes.service';
import { MascotasService } from '../../core/services/mascotas.service';
import { ConsultasService } from '../../core/services/consultas.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { PagosService } from '../../core/services/pagos.service';
import { CitasService } from '../../core/services/citas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { Vacuna } from '../../core/models';
import { EstadoRecordatorio, estadoRecordatorio, porProximaFecha } from '../../core/utils/vacunas';
import { inicioMes, ingresosPorMes } from '../../core/utils/metricas';
import {
  Comparado, FilaConteo, FilaMetodoPeriodo, FilaServicio, FilaVet, Indicadores, Periodo, RangoPeriodo,
  aCsv, atencionesPorEspecie, comparar, diagnosticosTop, indicadores, metodosPeriodo, rangoPeriodo, rendimientoVeterinarios, serviciosTop
} from '../../core/utils/reportes';
import { KpiComponent } from '../../shared/components/kpi/kpi.component';
import { Columna, GraficoColumnasComponent } from '../../shared/components/graficos/grafico-columnas.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

interface ReporteMes { mes: string; consultas: number; ingresos: number; }

@Component({
    selector: 'app-reportes',
    templateUrl: './reportes.component.html',
    styleUrls: ['./reportes.component.scss'],
    imports: [MatIcon, MatButton, MatIconButton, MatTooltip, KpiComponent, GraficoColumnasComponent]
})
export class ReportesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private pagosService = inject(PagosService);
  private citasService = inject(CitasService);
  private usuariosService = inject(UsuariosService);

  readonly periodos: { valor: Periodo; texto: string }[] = [
    { valor: 'mes', texto: 'Este mes' }, { valor: 'mesAnterior', texto: 'Mes anterior' },
    { valor: 'trimestre', texto: 'Últimos 3 meses' }, { valor: 'anio', texto: 'Últimos 12 meses' }
  ];
  periodo: Periodo = 'mes';
  rango!: RangoPeriodo;
  cifras!: Record<keyof Indicadores, Comparado>;
  servicios: FilaServicio[] = [];
  diagnosticos: FilaConteo[] = [];
  especies: FilaConteo[] = [];
  veterinarios: FilaVet[] = [];
  metodos: FilaMetodoPeriodo[] = [];

  // Tendencia de 6 meses (independiente del período elegido)
  reporteMensual: ReporteMes[] = [];
  columnasIngresos: Columna[] = [];
  columnasConsultas: Columna[] = [];

  // Recordatorios de vacunas (vencidas y de los próximos 7 días)
  vacunasPendientesList: Vacuna[] = [];
  private hoy = new Date();

  ngOnInit(): void {
    this.hoy = new Date();
    const pagos = this.pagosService.getAll();
    const consultas = this.consultasService.getAll();

    const meses = ingresosPorMes(pagos, this.hoy, 6);
    this.reporteMensual = meses.map((m, i) => {
      const ini = inicioMes(this.hoy, -(5 - i));
      const fin = inicioMes(this.hoy, -(5 - i) + 1);
      return { mes: m.etiqueta, ingresos: m.total, consultas: consultas.filter(c => new Date(c.fecha) >= ini && new Date(c.fecha) < fin).length };
    });
    this.columnasIngresos = meses.map(m => ({ etiqueta: m.etiqueta, nombre: m.nombre, valor: m.total, parcial: m.enCurso }));
    this.columnasConsultas = meses.map((m, i) => ({ etiqueta: m.etiqueta, nombre: m.nombre, valor: this.reporteMensual[i].consultas, parcial: m.enCurso }));

    this.vacunasPendientesList = this.vacunasService.getPendientes(this.hoy).sort(porProximaFecha);
    this.calcular();
  }

  elegirPeriodo(p: Periodo): void { this.periodo = p; this.calcular(); }

  private calcular(): void {
    const pagos = this.pagosService.getAll();
    const consultas = this.consultasService.getAll();
    const clientes = this.clientesService.getAll();
    const citas = this.citasService.getAll();
    this.rango = rangoPeriodo(this.periodo, this.hoy);
    this.cifras = comparar(
      indicadores(this.rango, pagos, consultas, clientes, citas, this.hoy),
      indicadores(this.rango.anterior, pagos, consultas, clientes, citas, this.hoy)
    );
    this.servicios = serviciosTop(pagos, this.rango);
    this.diagnosticos = diagnosticosTop(consultas, this.rango);
    this.especies = atencionesPorEspecie(consultas, this.mascotasService.getAll(), this.rango);
    this.veterinarios = rendimientoVeterinarios(this.usuariosService.getAll(), consultas, pagos, this.rango);
    this.metodos = metodosPeriodo(pagos, this.rango);
  }

  delta(c: Comparado, subirEsBueno = true) {
    return c.variacion === null ? null : { porcentaje: c.variacion, contra: 'vs. ' + this.rango.anterior.etiqueta, subirEsBueno };
  }

  readonly moneda = (v: number) => '$' + v.toLocaleString('es-PA', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  readonly entero = (v: number) => v.toLocaleString('es-PA');

  get maxServicio(): number { return Math.max(...this.servicios.map(s => s.total), 1); }
  get maxVet(): number { return Math.max(...this.veterinarios.map(v => v.ingresos), 1); }

  // ---------- Exportar ----------
  exportar(tabla: 'servicios' | 'veterinarios' | 'diagnosticos' | 'especies' | 'metodos'): void {
    const p = this.rango.etiqueta;
    const csv = {
      servicios: () => aCsv(['Servicio', 'Cantidad', 'Total cobrado', '% del total'], this.servicios.map(s => [s.servicio, s.cantidad, s.total.toFixed(2), s.porcentaje])),
      veterinarios: () => aCsv(['Veterinario', 'Especialidad', 'Atenciones', 'Sin cita', 'Ingresos'], this.veterinarios.map(v => [v.nombre, v.especialidad, v.atenciones, v.inmediatas, v.ingresos.toFixed(2)])),
      diagnosticos: () => aCsv(['Diagnóstico', 'Casos', '%'], this.diagnosticos.map(d => [d.nombre, d.cantidad, d.porcentaje])),
      especies: () => aCsv(['Especie', 'Atenciones', '%'], this.especies.map(e => [e.nombre, e.cantidad, e.porcentaje])),
      metodos: () => aCsv(['Método', 'Cobros', 'Total', '%'], this.metodos.map(m => [m.metodo, m.cobros, m.total.toFixed(2), m.porcentaje]))
    }[tabla]();
    descargar(csv, `vetsystem-${tabla}-${p.replace(/[^\p{L}\d]+/gu, '-').toLowerCase()}.csv`);
  }

  imprimir(): void { window.print(); }

  // ---------- Recordatorios (compatibilidad) ----------
  /** Etiqueta del recordatorio: una vacuna con fecha pasada se muestra como vencida, no como próxima. */
  estadoVacuna(v: Vacuna): EstadoRecordatorio {
    return estadoRecordatorio(v, this.hoy);
  }

  get vacunasVencidas(): number {
    return this.vacunasPendientesList.filter(v => this.estadoVacuna(v) === 'vencida').length;
  }

  /** Texto alternativo de los gráficos de barras (lectores de pantalla). */
  get resumenConsultas(): string {
    return 'Consultas por mes: ' + this.reporteMensual.map(r => r.mes + ' ' + r.consultas).join(', ');
  }

  get resumenIngresos(): string {
    return 'Ingresos por mes en dólares: ' + this.reporteMensual.map(r => r.mes + ' ' + Math.round(r.ingresos)).join(', ');
  }
}

function descargar(contenido: string, nombre: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
