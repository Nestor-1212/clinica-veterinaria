import { Routes } from '@angular/router';
import { ListaVacunasComponent } from './lista-vacunas/lista-vacunas.component';
import { FormVacunaComponent } from './form-vacuna/form-vacuna.component';

const routes: Routes = [
  { path: '', component: ListaVacunasComponent, title: 'Vacunas' },
  { path: 'nueva', component: FormVacunaComponent, title: 'Nueva vacuna' },
  { path: 'editar/:id', component: FormVacunaComponent, title: 'Editar vacuna' }
];

export default routes;
