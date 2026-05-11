import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaPagosComponent } from './lista-pagos/lista-pagos.component';
import { FormPagoComponent } from './form-pago/form-pago.component';

const routes: Routes = [
  { path: '', component: ListaPagosComponent },
  { path: 'nuevo', component: FormPagoComponent }
];

@NgModule({
  declarations: [ListaPagosComponent, FormPagoComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class PagosModule {}
