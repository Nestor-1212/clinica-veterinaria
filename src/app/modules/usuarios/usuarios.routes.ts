import { Routes } from '@angular/router';
import { ListaUsuariosComponent } from './lista-usuarios/lista-usuarios.component';
import { FormUsuarioComponent } from './form-usuario/form-usuario.component';

const routes: Routes = [
  { path: '', component: ListaUsuariosComponent, title: 'Usuarios' },
  { path: 'nuevo', component: FormUsuarioComponent, title: 'Nuevo usuario' },
  { path: 'editar/:id', component: FormUsuarioComponent, title: 'Editar usuario' }
];

export default routes;
