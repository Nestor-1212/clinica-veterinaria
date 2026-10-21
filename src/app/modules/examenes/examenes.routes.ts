import { Routes } from '@angular/router';
import { ListaExamenesComponent } from './lista-examenes/lista-examenes.component';
import { FormExamenComponent } from './form-examen/form-examen.component';

const routes: Routes = [
  { path: '', component: ListaExamenesComponent },
  { path: 'nuevo', component: FormExamenComponent },
  { path: 'editar/:id', component: FormExamenComponent }
];

export default routes;
