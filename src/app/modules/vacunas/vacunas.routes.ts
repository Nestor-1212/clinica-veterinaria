import { Routes } from '@angular/router';
import { ListaVacunasComponent } from './lista-vacunas/lista-vacunas.component';
import { FormVacunaComponent } from './form-vacuna/form-vacuna.component';

const routes: Routes = [
  { path: '', component: ListaVacunasComponent },
  { path: 'nueva', component: FormVacunaComponent },
  { path: 'editar/:id', component: FormVacunaComponent }
];

export default routes;
