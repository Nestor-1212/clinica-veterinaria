import { Routes } from '@angular/router';
import { ListaMascotasComponent } from './lista-mascotas/lista-mascotas.component';
import { FormMascotaComponent } from './form-mascota/form-mascota.component';
import { PerfilMascotaComponent } from './perfil-mascota/perfil-mascota.component';

const routes: Routes = [
  { path: '', component: ListaMascotasComponent, title: 'Mascotas' },
  { path: 'nueva', component: FormMascotaComponent, title: 'Nueva mascota' },
  { path: 'editar/:id', component: FormMascotaComponent, title: 'Editar mascota' },
  { path: ':id', component: PerfilMascotaComponent, title: 'Historial médico' }
];

export default routes;
