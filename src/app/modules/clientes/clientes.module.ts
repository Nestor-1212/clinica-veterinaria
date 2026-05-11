import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaClientesComponent } from './lista-clientes/lista-clientes.component';
import { FormClienteComponent } from './form-cliente/form-cliente.component';
import { DetalleClienteComponent } from './detalle-cliente/detalle-cliente.component';

const routes: Routes = [
  { path: '', component: ListaClientesComponent },
  { path: 'nuevo', component: FormClienteComponent },
  { path: 'editar/:id', component: FormClienteComponent },
  { path: ':id', component: DetalleClienteComponent }
];

@NgModule({
  declarations: [ListaClientesComponent, FormClienteComponent, DetalleClienteComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ClientesModule {}
