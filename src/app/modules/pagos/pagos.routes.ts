import { Routes } from '@angular/router';
import { ListaPagosComponent } from './lista-pagos/lista-pagos.component';
import { FormPagoComponent } from './form-pago/form-pago.component';

const routes: Routes = [
  { path: '', component: ListaPagosComponent },
  { path: 'nuevo', component: FormPagoComponent }
];

export default routes;
