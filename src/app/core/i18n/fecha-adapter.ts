import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Fechas escritas a mano en día/mes/año. El adaptador nativo usa Date.parse, que lee
 * "03/04/2026" como 4 de marzo (formato de EE. UU.); en una fecha de refuerzo de vacuna
 * ese error pasa desapercibido. Acepta separadores / - . y años de 2 o 4 dígitos.
 */
@Injectable()
export class FechaAdapter extends NativeDateAdapter {
  override parse(valor: unknown, formato?: unknown): Date | null {
    if (typeof valor === 'string') {
      const m = valor.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
      if (m) {
        const dia = Number(m[1]);
        const mes = Number(m[2]) - 1;
        const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        const fecha = new Date(anio, mes, dia);
        // Rechaza fechas imposibles (31/02, 13/13…) en vez de desbordarlas al mes siguiente
        return fecha.getFullYear() === anio && fecha.getMonth() === mes && fecha.getDate() === dia ? fecha : this.invalid();
      }
    }
    return super.parse(valor, formato);
  }
}
