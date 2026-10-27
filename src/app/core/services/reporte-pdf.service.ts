import { DIAS_AVISO_VACUNA } from '../utils/vacunas';
import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import { Comparado, FilaConteo, FilaMetodoPeriodo, FilaServicio, FilaVet, Indicadores, RangoPeriodo } from '../utils/reportes';

/** Lo que el informe necesita: los mismos datos que muestra la pantalla de Reportes. */
export interface DatosReporte {
  rango: RangoPeriodo;
  cifras: Record<keyof Indicadores, Comparado>;
  vacunasVencidas: number;
  vacunasProximas: number;
  ingresosMes: { etiqueta: string; valor: number; parcial?: boolean }[];
  atencionesMes: { etiqueta: string; valor: number; parcial?: boolean }[];
  servicios: FilaServicio[];
  veterinarios: FilaVet[];
  diagnosticos: FilaConteo[];
  especies: FilaConteo[];
  metodos: FilaMetodoPeriodo[];
}

export type SeccionReporte = 'resumen' | 'tendencia' | 'servicios' | 'veterinarios' | 'diagnosticos' | 'especies' | 'metodos';

export const TITULO_SECCION: Record<SeccionReporte, string> = {
  resumen: 'Resumen del período', tendencia: 'Tendencia de 6 meses', servicios: 'Servicios más vendidos',
  veterinarios: 'Rendimiento por veterinario', diagnosticos: 'Diagnósticos frecuentes', especies: 'Especies atendidas', metodos: 'Métodos de pago'
};

type RGB = [number, number, number];
// Paleta de la app (tokens --vs-*) en RGB para jsPDF
const C = {
  marca: [12, 56, 51] as RGB, primario: [0, 107, 94] as RGB, serie: [0, 135, 111] as RGB, serieSuave: [150, 207, 193] as RGB,
  suave: [226, 240, 236] as RGB, fondo: [243, 247, 246] as RGB, texto: [23, 32, 30] as RGB, secundario: [76, 92, 87] as RGB,
  tenue: [112, 126, 121] as RGB, borde: [218, 227, 224] as RGB, bien: [27, 107, 58] as RGB, mal: [178, 34, 34] as RGB, atencion: [154, 72, 0] as RGB
};

const A4 = { ancho: 210, alto: 297 };
const M = 16;                       // margen
const ANCHO = A4.ancho - 2 * M;     // ancho útil
const PIE = 14;                     // reserva para el pie

/**
 * Informe de Reportes en PDF (A4): encabezado de la clínica, indicadores con su comparación,
 * gráficos de 6 meses y tablas con barras, con pie y número de página en todas las hojas.
 * Se puede pedir completo o solo una sección.
 */
@Injectable({ providedIn: 'root' })
export class ReportePdfService {
  private doc!: jsPDF;
  private y = 0;

  async descargar(datos: DatosReporte, secciones: SeccionReporte[] = ['resumen', 'tendencia', 'servicios', 'veterinarios', 'diagnosticos', 'especies', 'metodos']): Promise<void> {
    const { jsPDF } = await import('jspdf');
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const completo = secciones.length > 1;
    const titulo = completo ? 'Reporte de la clínica' : TITULO_SECCION[secciones[0]];
    this.portada(titulo, datos.rango);

    for (const s of secciones) {
      switch (s) {
        case 'resumen': this.resumen(datos); break;
        case 'tendencia': this.tendencia(datos); break;
        case 'servicios': this.tabla(TITULO_SECCION.servicios, 'Por ingreso cobrado en el período (antes de descuentos)',
          [{ t: 'Servicio', w: 0.56, barra: true }, { t: 'Cantidad', w: 0.14, der: true }, { t: 'Total', w: 0.18, der: true, fuerte: true }, { t: '%', w: 0.12, der: true }],
          datos.servicios.map(f => ({ celdas: [f.servicio, ent(f.cantidad), mon(f.total), f.porcentaje + ' %'], barra: f.total })), 'Sin cobros en este período.');
          break;
        case 'veterinarios': this.tabla(TITULO_SECCION.veterinarios, 'Atenciones del período e ingresos cobrados de sus consultas',
          [{ t: 'Veterinario', w: 0.46, barra: true }, { t: 'Especialidad', w: 0.2 }, { t: 'Atenciones', w: 0.16, der: true }, { t: 'Ingresos', w: 0.18, der: true, fuerte: true }],
          datos.veterinarios.map(v => ({ celdas: [v.nombre, v.especialidad || '-', ent(v.atenciones) + (v.inmediatas ? ` (${v.inmediatas} sin cita)` : ''), mon(v.ingresos)], barra: v.ingresos })), 'Sin atenciones en este período.');
          break;
        case 'diagnosticos': this.tabla(TITULO_SECCION.diagnosticos, 'Casos registrados en las consultas del período',
          [{ t: '#', w: 0.07 }, { t: 'Diagnóstico', w: 0.63, barra: true }, { t: 'Casos', w: 0.15, der: true, fuerte: true }, { t: '%', w: 0.15, der: true }],
          datos.diagnosticos.map((d, i) => ({ celdas: [String(i + 1), d.nombre, ent(d.cantidad), d.porcentaje + ' %'], barra: d.cantidad })), 'Sin consultas en este período.');
          break;
        case 'especies': this.tabla(TITULO_SECCION.especies, 'Atenciones del período por especie del paciente',
          [{ t: 'Especie', w: 0.6, barra: true }, { t: 'Atenciones', w: 0.2, der: true, fuerte: true }, { t: '%', w: 0.2, der: true }],
          datos.especies.map(e => ({ celdas: [e.nombre, ent(e.cantidad), e.porcentaje + ' %'], barra: e.cantidad })), 'Sin atenciones en este período.');
          break;
        case 'metodos': this.tabla(TITULO_SECCION.metodos, 'Cobrado en el período por método de pago',
          [{ t: 'Método', w: 0.46, barra: true }, { t: 'Cobros', w: 0.16, der: true }, { t: 'Total', w: 0.22, der: true, fuerte: true }, { t: '%', w: 0.16, der: true }],
          datos.metodos.map(m => ({ celdas: [m.metodo, ent(m.cobros), mon(m.total), m.porcentaje + ' %'], barra: m.total })), 'Sin cobros en este período.');
          break;
      }
    }

    this.nota('Los ingresos cuentan en la fecha en que se cobraron y excluyen pagos anulados. "No asistieron": citas cuya hora pasó sin atención ni cancelación.');
    this.pies(titulo, datos.rango.etiqueta);
    const nombre = completo ? 'reporte' : secciones[0];
    this.doc.save(`vetsystem-${nombre}-${slug(datos.rango.etiqueta)}.pdf`);
  }

  // ---------- Estructura ----------

  private portada(titulo: string, rango: RangoPeriodo): void {
    const d = this.doc;
    d.setFillColor(...C.marca);
    d.rect(0, 0, A4.ancho, 44, 'F');
    // Marca
    d.setFillColor(...C.primario);
    d.roundedRect(M, 12, 10, 10, 2, 2, 'F');
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    d.text('VS', M + 5, 18.6, { align: 'center' });
    d.setFontSize(13);
    d.text('VetSystem', M + 13, 18.8);
    d.setFont('helvetica', 'normal');
    d.setFontSize(8.5);
    d.setTextColor(190, 220, 212);
    d.text('Clínica veterinaria · Ciudad de Panamá', M + 13, 23.4);
    // Título y período
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(19);
    d.text(titulo, M, 36);
    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    d.setTextColor(190, 220, 212);
    d.text(`Período: ${cap(rango.etiqueta)}`, A4.ancho - M, 16, { align: 'right' });
    d.text(`Comparado con: ${rango.anterior.etiqueta}`, A4.ancho - M, 21, { align: 'right' });
    d.text(`Generado: ${new Date().toLocaleString('es-PA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, A4.ancho - M, 26, { align: 'right' });
    this.y = 56;
  }

  /** Si no cabe `alto`, sigue en una hoja nueva (con una franja de marca fina). */
  private asegurar(alto: number): void {
    if (this.y + alto <= A4.alto - PIE - 4) return;
    this.doc.addPage();
    this.doc.setFillColor(...C.marca);
    this.doc.rect(0, 0, A4.ancho, 4, 'F');
    this.y = 16;
  }

  private titulo(texto: string, sub?: string): void {
    this.asegurar(sub ? 16 : 11);
    const d = this.doc;
    d.setFillColor(...C.primario);
    d.rect(M, this.y - 3.6, 1.2, 4.6, 'F');
    d.setFont('helvetica', 'bold');
    d.setFontSize(12.5);
    d.setTextColor(...C.texto);
    d.text(texto, M + 3.5, this.y);
    this.y += 5;
    if (sub) {
      d.setFont('helvetica', 'normal');
      d.setFontSize(8.5);
      d.setTextColor(...C.secundario);
      d.text(sub, M + 3.5, this.y);
      this.y += 5;
    }
    this.y += 1.5;
  }

  // ---------- Secciones ----------

  private resumen(dt: DatosReporte): void {
    const c = dt.cifras;
    const contra = `vs. ${dt.rango.anterior.etiqueta}`;
    const tarjetas: Tarjeta[] = [
      { etiqueta: 'Ingresos cobrados', valor: mon(c.ingresos.actual), delta: c.ingresos.variacion, ayuda: `${ent(c.cobros.actual)} cobros · antes ${mon(c.ingresos.anterior)}` },
      { etiqueta: 'Atenciones', valor: ent(c.atenciones.actual), delta: c.atenciones.variacion, ayuda: `antes ${ent(c.atenciones.anterior)}` },
      { etiqueta: 'Ticket promedio', valor: mon(c.ticket.actual), delta: c.ticket.variacion, ayuda: `antes ${mon(c.ticket.anterior)}` },
      { etiqueta: 'Clientes nuevos', valor: ent(c.clientesNuevos.actual), delta: c.clientesNuevos.variacion, ayuda: `antes ${ent(c.clientesNuevos.anterior)}` },
      { etiqueta: 'No asistieron', valor: `${c.inasistencia.actual} %`, delta: c.inasistencia.variacion, subirEsMalo: true, ayuda: 'de las citas que ya pasaron', atencion: c.inasistencia.actual >= 15 },
      { etiqueta: 'Refuerzos vencidos', valor: ent(dt.vacunasVencidas), ayuda: `${dt.vacunasProximas} vencen en ${DIAS_AVISO_VACUNA} días`, atencion: dt.vacunasVencidas > 0 }
    ];
    this.titulo(TITULO_SECCION.resumen, `Cifras del período comparadas ${contra}`);
    const d = this.doc;
    const gap = 4, w = (ANCHO - 2 * gap) / 3, h = 27;
    tarjetas.forEach((t, i) => {
      if (i % 3 === 0) this.asegurar(h + gap);
      const x = M + (i % 3) * (w + gap);
      const y = this.y;
      d.setFillColor(...(i === 0 ? C.suave : C.fondo));
      d.roundedRect(x, y, w, h, 2.5, 2.5, 'F');
      d.setFont('helvetica', 'normal');
      d.setFontSize(8);
      d.setTextColor(...C.secundario);
      d.text(t.etiqueta, x + 4, y + 6);
      d.setFont('helvetica', 'bold');
      d.setFontSize(16);
      d.setTextColor(...(t.atencion ? C.atencion : C.texto));
      d.text(t.valor, x + 4, y + 14.5);
      d.setFontSize(7.5);
      if (t.delta !== undefined && t.delta !== null) {
        const bueno = t.subirEsMalo ? t.delta < 0 : t.delta > 0;
        d.setTextColor(...(t.delta === 0 ? C.tenue : bueno ? C.bien : C.mal));
        d.text(`${t.delta > 0 ? '+' : ''}${t.delta} %`, x + 4, y + 20);
        const anchoDelta = d.getTextWidth(`${t.delta > 0 ? '+' : ''}${t.delta} %`);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...C.tenue);
        d.text(contra, x + 5.5 + anchoDelta, y + 20);
      }
      d.setFont('helvetica', 'normal');
      d.setTextColor(...C.tenue);
      d.text(recortar(d, t.ayuda, w - 8), x + 4, y + 24.5);
      if (i % 3 === 2 || i === tarjetas.length - 1) this.y += h + gap;
    });
    this.y += 4;
  }

  private tendencia(dt: DatosReporte): void {
    this.titulo(TITULO_SECCION.tendencia, 'Mes en curso en tono claro: suma hasta hoy');
    const alto = 62, gap = 6, w = (ANCHO - gap) / 2;
    this.asegurar(alto + 4);
    this.columnas(M, this.y, w, alto, 'Ingresos cobrados por mes', dt.ingresosMes, mon);
    this.columnas(M + w + gap, this.y, w, alto, 'Atenciones por mes', dt.atencionesMes, ent);
    this.y += alto + 8;
  }

  /** Gráfico de columnas de una serie: rejilla tenue, valor sobre cada columna. */
  private columnas(x: number, y: number, w: number, h: number, titulo: string, datos: DatosReporte['ingresosMes'], formato: (v: number) => string): void {
    const d = this.doc;
    d.setFillColor(...C.fondo);
    d.roundedRect(x, y, w, h, 2.5, 2.5, 'F');
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    d.setTextColor(...C.texto);
    d.text(titulo, x + 4, y + 7);
    const base = y + h - 9, techo = y + 16, alto = base - techo;
    const max = Math.max(...datos.map(c => c.valor), 1);
    d.setDrawColor(...C.borde);
    d.setLineWidth(0.2);
    [0, 0.5, 1].forEach(t => d.line(x + 4, base - alto * t, x + w - 4, base - alto * t));
    const paso = (w - 8) / datos.length, ancho = Math.min(9, paso * 0.55);
    datos.forEach((c, i) => {
      const cx = x + 4 + paso * i + paso / 2;
      const hc = Math.max(0.6, (c.valor / max) * alto);
      d.setFillColor(...(c.parcial ? C.serieSuave : C.serie));
      d.roundedRect(cx - ancho / 2, base - hc, ancho, hc, 1.2, 1.2, 'F');
      d.rect(cx - ancho / 2, base - Math.min(hc, 1.2), ancho, Math.min(hc, 1.2), 'F'); // base plana
      d.setFont('helvetica', 'bold');
      d.setFontSize(6.5);
      d.setTextColor(...C.secundario);
      d.text(formato(c.valor), cx, base - hc - 1.6, { align: 'center' });
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.5);
      d.setTextColor(...C.tenue);
      d.text(c.etiqueta + (c.parcial ? '*' : ''), cx, base + 5, { align: 'center' });
    });
  }

  /** Tabla con encabezado, filas alternadas y barra de magnitud bajo la primera columna marcada. */
  private tabla(titulo: string, sub: string, cols: Col[], filas: { celdas: string[]; barra: number }[], vacio: string): void {
    // El título no queda solo al pie de una hoja: viaja con el encabezado y las primeras filas
    this.asegurar(16 + 8 + 10 * Math.min(Math.max(filas.length, 1), 3));
    this.titulo(titulo, sub);
    const d = this.doc;
    if (!filas.length) {
      this.asegurar(10);
      d.setFont('helvetica', 'italic');
      d.setFontSize(9);
      d.setTextColor(...C.tenue);
      d.text(vacio, M + 3.5, this.y + 3);
      this.y += 12;
      return;
    }
    const max = Math.max(...filas.map(f => f.barra), 1);
    const hFila = 10, hCab = 8;
    const encabezado = () => {
      d.setFillColor(...C.marca);
      d.roundedRect(M, this.y, ANCHO, hCab, 1.5, 1.5, 'F');
      d.setFont('helvetica', 'bold');
      d.setFontSize(8);
      d.setTextColor(255, 255, 255);
      let x = M;
      cols.forEach(c => {
        const wc = c.w * ANCHO;
        d.text(c.t, c.der ? x + wc - 3 : x + 3, this.y + 5.3, { align: c.der ? 'right' : 'left' });
        x += wc;
      });
      this.y += hCab;
    };
    encabezado();
    filas.forEach((f, i) => {
      if (this.y + hFila > A4.alto - PIE - 4) {
        this.asegurar(A4.alto);
        d.setFont('helvetica', 'normal');
        d.setFontSize(8.5);
        d.setTextColor(...C.secundario);
        d.text(`${titulo} (continuación)`, M, this.y);
        this.y += 4;
        encabezado();
      }
      if (i % 2 === 1) { d.setFillColor(...C.fondo); d.rect(M, this.y, ANCHO, hFila, 'F'); }
      let x = M;
      cols.forEach((c, j) => {
        const wc = c.w * ANCHO;
        const conBarra = c.barra;
        d.setFont('helvetica', c.fuerte ? 'bold' : 'normal');
        d.setFontSize(8.5);
        d.setTextColor(...(c.t === '%' ? C.tenue : C.texto));
        const texto = recortar(d, f.celdas[j], wc - 6);
        d.text(texto, c.der ? x + wc - 3 : x + 3, this.y + (conBarra ? 4.6 : 6.2), { align: c.der ? 'right' : 'left' });
        if (conBarra) {
          const wb = wc - 8;
          d.setFillColor(...C.borde);
          d.roundedRect(x + 3, this.y + 6.6, wb, 1.6, 0.8, 0.8, 'F');
          d.setFillColor(...C.serie);
          d.roundedRect(x + 3, this.y + 6.6, Math.max(1.6, (f.barra / max) * wb), 1.6, 0.8, 0.8, 'F');
        }
        x += wc;
      });
      this.y += hFila;
    });
    d.setDrawColor(...C.borde);
    d.setLineWidth(0.3);
    d.line(M, this.y, M + ANCHO, this.y);
    this.y += 9;
  }

  private nota(texto: string): void {
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(7.5);
    const lineas = d.splitTextToSize(texto, ANCHO) as string[];
    this.asegurar(lineas.length * 3.6 + 2);
    d.setTextColor(...C.tenue);
    d.text(lineas, M, this.y);
  }

  private pies(titulo: string, periodo: string): void {
    const d = this.doc;
    const total = d.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      d.setPage(p);
      d.setDrawColor(...C.borde);
      d.setLineWidth(0.3);
      d.line(M, A4.alto - PIE + 2, A4.ancho - M, A4.alto - PIE + 2);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.5);
      d.setTextColor(...C.tenue);
      d.text(`VetSystem · ${titulo} · ${cap(periodo)}`, M, A4.alto - PIE + 7);
      d.text(`Página ${p} de ${total}`, A4.ancho - M, A4.alto - PIE + 7, { align: 'right' });
    }
  }
}

interface Tarjeta { etiqueta: string; valor: string; delta?: number | null; subirEsMalo?: boolean; ayuda: string; atencion?: boolean; }
interface Col { t: string; w: number; der?: boolean; barra?: boolean; fuerte?: boolean; }

const mon = (v: number) => '$' + v.toLocaleString('es-PA', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
const ent = (v: number) => v.toLocaleString('es-PA');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/** Recorta con "…" si el texto no cabe en `ancho` mm. */
function recortar(d: jsPDF, texto: string, ancho: number): string {
  if (d.getTextWidth(texto) <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && d.getTextWidth(t + '...') > ancho) t = t.slice(0, -1);
  return t.trimEnd() + '...';
}
