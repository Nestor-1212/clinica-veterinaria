import { Routes } from '@angular/router';
import { ListaUsuariosComponent } from './lista-usuarios/lista-usuarios.component';
import { FormUsuarioComponent } from './form-usuario/form-usuario.component';

const routes: Routes = [
  { path: '', component: ListaUsuariosComponent },
  { path: 'nuevo', component: FormUsuarioComponent },
  { path: 'editar/:id', component: FormUsuarioComponent }
];

export default routes;
