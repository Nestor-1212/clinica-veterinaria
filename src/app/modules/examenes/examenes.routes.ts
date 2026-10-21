import { Routes } from '@angular/router';
import { ListaExamenesComponent } from './lista-examenes/lista-examenes.component';
import { FormExamenComponent } from './form-examen/form-examen.component';

const routes: Routes = [
  { path: '', component: ListaExamenesComponent, title: 'Laboratorio' },
  { path: 'nuevo', component: FormExamenComponent, title: 'Nuevo examen' },
  { path: 'editar/:id', component: FormExamenComponent, title: 'Editar examen' }
];

export default routes;
