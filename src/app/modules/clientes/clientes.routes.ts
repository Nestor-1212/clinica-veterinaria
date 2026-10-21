import { Routes } from '@angular/router';
import { ListaClientesComponent } from './lista-clientes/lista-clientes.component';
import { FormClienteComponent } from './form-cliente/form-cliente.component';
import { DetalleClienteComponent } from './detalle-cliente/detalle-cliente.component';

const routes: Routes = [
  { path: '', component: ListaClientesComponent },
  { path: 'nuevo', component: FormClienteComponent },
  { path: 'editar/:id', component: FormClienteComponent },
  { path: ':id', component: DetalleClienteComponent }
];

export default routes;
