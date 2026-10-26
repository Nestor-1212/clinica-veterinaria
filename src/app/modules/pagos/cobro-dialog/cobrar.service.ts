import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';
import { Pago } from '../../../core/models';
import { PagosService } from '../../../core/services/pagos.service';
import { CobroDialogComponent, DatosCobro, ResultadoCobro } from './cobro-dialog.component';

/**
 * Un único flujo de cobro (Pagos y expediente del cliente): panel con conceptos y método,
 * cobro con el método elegido y aviso centrado con "Deshacer" durante unos segundos.
 * Emite true si el pago quedó cobrado.
 */
@Injectable({ providedIn: 'root' })
export class CobrarService {
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private pagos = inject(PagosService);

  /** @param alDeshacer se llama si el usuario deshace el cobro desde el aviso (para refrescar la vista). */
  cobrar(pago: Pago, cliente: string, mascota: string, alDeshacer?: () => void): Observable<boolean> {
    const datos: DatosCobro = { pago, cliente, mascota };
    return this.dialog.open<CobroDialogComponent, DatosCobro, ResultadoCobro | boolean>(CobroDialogComponent, { data: datos, width: '520px', maxWidth: '94vw', autoFocus: '.metodo' })
      .afterClosed()
      .pipe(
        map(r => {
          if (!r) return false;
          const anterior = { metodoPago: pago.metodoPago, referencia: pago.referencia };
          const ok = this.pagos.marcarPagado(pago.id, typeof r === 'object' ? r : undefined);
          if (ok) this.avisar(pago, cliente, anterior, alDeshacer);
          return ok;
        })
      );
  }

  private avisar(pago: Pago, cliente: string, anterior: Pick<Pago, 'metodoPago' | 'referencia'>, alDeshacer?: () => void): void {
    const total = '$' + pago.total.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const aviso = this.snack.open(`Cobro registrado: ${total} de ${cliente}`, 'Deshacer', {
      duration: 6000, panelClass: 'snack-centro', verticalPosition: 'top', horizontalPosition: 'center'
    });
    aviso.onAction().subscribe(() => {
      if (this.pagos.deshacerCobro(pago.id, anterior)) {
        alDeshacer?.();
        this.snack.open('Cobro deshecho: el pago vuelve a estar pendiente', 'OK', { duration: 3000, panelClass: 'snack-centro', verticalPosition: 'top' });
      }
    });
  }
}
