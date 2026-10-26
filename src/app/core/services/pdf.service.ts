import { Injectable } from '@angular/core';
import { Receta, Mascota, Cliente, Usuario, Pago, ItemPago } from '../models';
import { formatearEdad } from '../utils/edad';

@Injectable({ providedIn: 'root' })
export class PdfService {
  async generarReceta(receta: Receta, mascota: Mascota, cliente: Cliente, veterinario: Usuario): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 121, 107);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CLÍNICA VETERINARIA', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Ciudad de Panamá', pageW / 2, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECETA MÉDICA VETERINARIA', pageW / 2, 45, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 55;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, pageW - 10, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL PACIENTE', 10, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Mascota: ${mascota.nombre}`, 10, y);
    doc.text(`Especie: ${mascota.tipo}`, 80, y);
    doc.text(`Raza: ${mascota.raza}`, 140, y);
    y += 5;
    doc.text(`Edad: ${formatearEdad(mascota.edad)}`, 10, y);
    doc.text(`Peso: ${mascota.peso} kg`, 80, y);
    doc.text(`Sexo: ${mascota.sexo}`, 140, y);
    y += 5;
    doc.text(`Propietario: ${cliente.nombre}`, 10, y);
    doc.text(`Cédula: ${cliente.cedula}`, 140, y);
    y += 5;
    doc.text(`Fecha: ${new Date(receta.fecha).toLocaleDateString('es-PA')}`, 10, y);
    y += 6;

    // Alergias: dato crítico para quien despacha el medicamento (en rojo si las hay)
    const alergias = (mascota.alergias || '').trim();
    const lineasAlergia = doc.splitTextToSize(alergias ? `ALERGIAS: ${alergias}` : 'Alergias: no indicadas en el expediente', pageW - 30) as string[];
    const altoAlergia = lineasAlergia.length * 5 + 4;
    if (alergias) doc.setFillColor(255, 218, 214); else doc.setFillColor(240, 244, 242);
    doc.roundedRect(10, y - 1, pageW - 20, altoAlergia, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    if (alergias) doc.setTextColor(147, 0, 10); else doc.setTextColor(85, 101, 95);
    doc.text(lineasAlergia, 15, y + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += altoAlergia + 3;

    doc.line(10, y, pageW - 10, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Rp/', 10, y);
    y += 6;

    receta.items.forEach((item, i) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${item.medicamento}`, 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`   Dosis: ${item.dosis}`, 15, y);
      doc.text(`Frecuencia: ${item.frecuencia}`, 80, y);
      doc.text(`Duración: ${item.duracion}`, 140, y);
      y += 4;
      if (item.indicaciones) {
        doc.text(`   Indicaciones: ${item.indicaciones}`, 15, y);
        y += 4;
      }
      y += 2;
    });

    if (receta.observaciones) {
      y += 4;
      doc.line(10, y, pageW - 10, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 10, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(receta.observaciones, pageW - 20);
      doc.text(lines, 10, y);
      y += lines.length * 5;
    }

    y += 15;
    doc.line(60, y, pageW - 60, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${veterinario.nombre} ${veterinario.apellido}`, pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    if (veterinario.especialidad) {
      doc.text(veterinario.especialidad, pageW / 2, y, { align: 'center' });
    }

    doc.save(`receta_${mascota.nombre}_${new Date(receta.fecha).toLocaleDateString('es-PA').replace(/\//g, '-')}.pdf`);
  }

  async generarFactura(pago: Pago, cliente: Cliente, mascota: Mascota): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(12, 56, 51);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CLÍNICA VETERINARIA', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('VetSystem · Ciudad de Panamá', pageW / 2, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.text('Comprobante interno: no es una factura fiscal', pageW / 2, 29, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO', pageW / 2, 45, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 55;

    doc.text(`Fecha: ${new Date(pago.fecha).toLocaleDateString('es-PA')}`, 10, y);
    const estado = pago.estado === 'pagado' ? 'PAGADO' : pago.estado === 'pendiente' ? 'PENDIENTE DE PAGO' : 'ANULADO';
    doc.setFont('helvetica', 'bold');
    doc.text(estado, pageW - 10, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Cliente: ${cliente.nombre}`, 10, y);
    doc.text(`Cédula: ${cliente.cedula}`, pageW - 10, y, { align: 'right' });
    y += 5;
    doc.text(`Mascota: ${mascota.nombre} (${mascota.tipo})`, 10, y);
    y += 8;

    doc.setFillColor(0, 107, 94);
    doc.rect(10, y, pageW - 20, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción', 13, y + 5);
    doc.text('Cant.', 105, y + 5);
    doc.text('Precio', 130, y + 5);
    doc.text('Subtotal', pageW - 12, y + 5, { align: 'right' });
    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    pago.items.forEach((item: ItemPago, idx: number) => {
      if (idx % 2 === 0) {
        doc.setFillColor(240, 246, 244);
        doc.rect(10, y - 3, pageW - 20, 7, 'F');
      }
      doc.text(item.descripcion, 13, y + 2);
      doc.text(String(item.cantidad), 108, y + 2);
      doc.text(`$${item.precioUnitario.toFixed(2)}`, 133, y + 2);
      doc.text(`$${item.subtotal.toFixed(2)}`, pageW - 12, y + 2, { align: 'right' });
      y += 7;
    });

    y += 5;
    doc.line(pageW - 70, y, pageW - 10, y);
    y += 5;
    doc.text(`Subtotal:`, pageW - 60, y);
    doc.text(`$${pago.subtotal.toFixed(2)}`, pageW - 10, y, { align: 'right' });
    y += 5;
    doc.text(`Descuento:`, pageW - 60, y);
    doc.text(`-$${pago.descuento.toFixed(2)}`, pageW - 10, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL:`, pageW - 60, y);
    doc.text(`$${pago.total.toFixed(2)}`, pageW - 10, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    const metodos: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yappy: 'Yappy', transferencia: 'Transferencia' };
    doc.text(`Método de pago: ${metodos[pago.metodoPago] ?? pago.metodoPago}${pago.referencia ? ' · Ref. ' + pago.referencia : ''}`, pageW - 10, y, { align: 'right' });
    if (pago.fechaPago) {
      y += 5;
      doc.text(`Cobrado el ${new Date(pago.fechaPago).toLocaleDateString('es-PA')}`, pageW - 10, y, { align: 'right' });
    }

    doc.save(`comprobante_${cliente.nombre.split(' ')[0].toLowerCase()}_${new Date(pago.fecha).toLocaleDateString('es-PA').replace(/\//g, '-')}.pdf`);
  }
}
