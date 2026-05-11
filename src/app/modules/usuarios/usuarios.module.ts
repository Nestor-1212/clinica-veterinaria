import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaUsuariosComponent } from './lista-usuarios/lista-usuarios.component';
import { FormUsuarioComponent } from './form-usuario/form-usuario.component';

const routes: Routes = [
  { path: '', component: ListaUsuariosComponent },
  { path: 'nuevo', component: FormUsuarioComponent },
  { path: 'editar/:id', component: FormUsuarioComponent }
];

@NgModule({
  declarations: [ListaUsuariosComponent, FormUsuarioComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class UsuariosModule {}
