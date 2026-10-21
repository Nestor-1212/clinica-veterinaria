import { Routes } from '@angular/router';
import { ListaConsultasComponent } from './lista-consultas/lista-consultas.component';
import { FormConsultaComponent } from './form-consulta/form-consulta.component';

const routes: Routes = [
  { path: '', component: ListaConsultasComponent, title: 'Consultas' },
  { path: 'nueva', component: FormConsultaComponent, title: 'Nueva consulta' },
  { path: 'editar/:id', component: FormConsultaComponent, title: 'Editar consulta' }
];

export default routes;
