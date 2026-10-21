import { Routes } from '@angular/router';
import { ListaClientesComponent } from './lista-clientes/lista-clientes.component';
import { FormClienteComponent } from './form-cliente/form-cliente.component';
import { DetalleClienteComponent } from './detalle-cliente/detalle-cliente.component';

const routes: Routes = [
  { path: '', component: ListaClientesComponent, title: 'Clientes' },
  { path: 'nuevo', component: FormClienteComponent, title: 'Nuevo cliente' },
  { path: 'editar/:id', component: FormClienteComponent, title: 'Editar cliente' },
  { path: ':id', component: DetalleClienteComponent, title: 'Expediente del cliente' }
];

export default routes;
