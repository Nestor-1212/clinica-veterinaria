import { Routes } from '@angular/router';
import { ListaMascotasComponent } from './lista-mascotas/lista-mascotas.component';
import { FormMascotaComponent } from './form-mascota/form-mascota.component';
import { PerfilMascotaComponent } from './perfil-mascota/perfil-mascota.component';

const routes: Routes = [
  { path: '', component: ListaMascotasComponent },
  { path: 'nueva', component: FormMascotaComponent },
  { path: 'editar/:id', component: FormMascotaComponent },
  { path: ':id', component: PerfilMascotaComponent }
];

export default routes;
