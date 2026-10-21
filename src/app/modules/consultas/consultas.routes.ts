import { Routes } from '@angular/router';
import { ListaConsultasComponent } from './lista-consultas/lista-consultas.component';
import { FormConsultaComponent } from './form-consulta/form-consulta.component';

const routes: Routes = [
  { path: '', component: ListaConsultasComponent },
  { path: 'nueva', component: FormConsultaComponent },
  { path: 'editar/:id', component: FormConsultaComponent }
];

export default routes;
