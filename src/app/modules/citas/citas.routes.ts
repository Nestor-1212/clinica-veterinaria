import { Routes } from '@angular/router';
import { ListaCitasComponent } from './lista-citas/lista-citas.component';
import { FormCitaComponent } from './form-cita/form-cita.component';

const routes: Routes = [
  { path: '', component: ListaCitasComponent },
  { path: 'nueva', component: FormCitaComponent }
];

export default routes;
