import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { asistenciaMes, ingresosPorCategoria, ingresosPorMes, porCobrar, porVeterinario, resumenIngresos } from '../../../core/utils/metricas';
import { KpiComponent } from '../../../shared/components/kpi/kpi.component';
import { Columna, GraficoColumnasComponent } from '../../../shared/components/graficos/grafico-columnas.component';
import { Barra, GraficoBarrasComponent } from '../../../shared/components/graficos/grafico-barras.component';
import { DatosDashboard, entero, moneda, plural, tramoAnterior } from '../dashboard-datos';

/** Pestaña "Negocio" (solo administración): cómo va el mes y de dónde viene el dinero. */
@Component({
  selector: 'app-dashboard-negocio',
  imports: [RouterLink, MatIcon, KpiComponent, GraficoColumnasComponent, GraficoBarrasComponent],
  templateUrl: './negocio.component.html',
  styleUrls: ['./pestanas.scss', './listas.scss', './negocio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NegocioComponent {
  readonly datos = input.required<DatosDashboard>();
  readonly moneda = moneda;
  readonly entero = entero;
  readonly plural = plural;

  readonly ingresos = computed(() => resumenIngresos(this.datos().pagos, this.datos().hoy));
  readonly contra = computed(() => tramoAnterior(this.datos().hoy));
  readonly cobrar = computed(() => porCobrar(this.datos().pagos, this.datos().hoy));
  readonly asistencia = computed(() => asistenciaMes(this.datos().citas, this.datos().consultas, this.datos().hoy));
  readonly veterinarios = computed(() => porVeterinario(this.datos().usuarios, this.datos().consultas, this.datos().pagos, this.datos().hoy));

  readonly meses = computed<Columna[]>(() =>
    ingresosPorMes(this.datos().pagos, this.datos().hoy).map(p => ({ etiqueta: p.etiqueta, nombre: p.nombre, valor: p.total, parcial: p.enCurso })));

  readonly categorias = computed<Barra[]>(() =>
    ingresosPorCategoria(this.datos().pagos, this.datos().hoy).map(c => ({ etiqueta: c.etiqueta, valor: c.total, detalle: `${c.porcentaje} %` })));

  readonly tramos = computed<Barra[]>(() =>
    this.cobrar().tramos.map(t => ({
      etiqueta: t.etiqueta, valor: t.total, detalle: `${t.cantidad} ${t.cantidad === 1 ? 'cobro' : 'cobros'}`,
      alerta: t.atrasado && t.cantidad ? 'Requiere gestión de cobro' : undefined
    })));

  readonly atrasado = computed(() => this.cobrar().tramos.find(t => t.atrasado)?.total ?? 0);
}
