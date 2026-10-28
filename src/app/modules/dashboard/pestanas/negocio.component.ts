import { deltaDe } from '../../../shared/components/kpi/delta';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { asistenciaMes, porCobrar, resumenIngresos } from '../../../core/utils/metricas';
import { KpiComponent } from '../../../shared/components/kpi/kpi.component';
import { Barra, GraficoBarrasComponent } from '../../../shared/components/graficos/grafico-barras.component';
import { DatosDashboard, entero, moneda, plural, tramoAnterior } from '../dashboard-datos';

/** Algo del mes que pide una decisión del administrador, con el lugar donde resolverlo. */
export interface AlertaNegocio {
  icono: string;
  titulo: string;
  detalle: string;
  enlace: string;
  consulta?: Record<string, string>;
  accion: string;
}

/** Umbrales a partir de los cuales una cifra del mes se vuelve alerta. */
const CAIDA_INGRESOS = -10;
const INASISTENCIA_ALTA = 10;
const CANCELACION_ALTA = 15;

/**
 * Pestaña "Negocio" (solo administración): no repite Reportes. Muestra cómo va el mes en una
 * cifra, lo que requiere atención (cobros atrasados, caída de ingresos, inasistencias) y la
 * antigüedad de lo pendiente por cobrar. El análisis (6 meses, servicios, veterinarios,
 * métodos) vive en Reportes.
 */
@Component({
  selector: 'app-dashboard-negocio',
  imports: [RouterLink, MatIcon, KpiComponent, GraficoBarrasComponent],
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

  readonly tramos = computed<Barra[]>(() =>
    this.cobrar().tramos.map(t => ({
      etiqueta: t.etiqueta, valor: t.total, detalle: `${t.cantidad} ${t.cantidad === 1 ? 'cobro' : 'cobros'}`,
      alerta: t.atrasado && t.cantidad ? 'Requiere gestión de cobro' : undefined
    })));

  readonly deltaAtendidas = computed(() => deltaDe(this.asistencia().atendidas, this.asistencia().atendidasTramoAnterior, 'conteo', this.contra()));

  readonly atrasado = computed(() => this.cobrar().tramos.find(t => t.atrasado) ?? null);

  readonly alertas = computed<AlertaNegocio[]>(() => {
    const lista: AlertaNegocio[] = [];
    const atr = this.atrasado();
    if (atr && atr.cantidad) {
      lista.push({
        icono: 'schedule', titulo: `${moneda(atr.total)} con más de 30 días sin cobrar`,
        detalle: `${plural(atr.cantidad, 'pago pendiente', 'pagos pendientes')} · conviene llamar o escribir por WhatsApp`,
        enlace: '/pagos', accion: 'Gestionar cobros'
      });
    }
    const ing = this.ingresos();
    if (ing.variacion !== null && ing.variacion <= CAIDA_INGRESOS) {
      lista.push({
        icono: 'trending_down', titulo: `Ingresos ${Math.abs(ing.variacion)} % por debajo del mismo tramo del mes anterior`,
        detalle: `${moneda(ing.mes)} frente a ${moneda(ing.mismoTramoAnterior)} (${this.contra()})`,
        enlace: '/reportes', accion: 'Analizar en Reportes'
      });
    }
    const a = this.asistencia();
    if (a.programadas && a.tasaInasistencia >= INASISTENCIA_ALTA) {
      lista.push({
        icono: 'event_busy', titulo: `${a.tasaInasistencia} % de las citas no asistieron`,
        detalle: `${entero(a.noAsistieron)} de ${entero(a.programadas)} este mes · el recordatorio del día anterior las reduce`,
        enlace: '/citas', consulta: { vista: 'confirmar' }, accion: 'Ver por confirmar'
      });
    }
    if (a.programadas && a.tasaCancelacion >= CANCELACION_ALTA) {
      lista.push({
        icono: 'event_repeat', titulo: `${a.tasaCancelacion} % de las citas se cancelaron`,
        detalle: `${entero(a.canceladas)} de ${entero(a.programadas)} este mes`,
        enlace: '/citas', consulta: { vista: 'historial' }, accion: 'Ver las citas'
      });
    }
    return lista;
  });
}
