import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaConsultasComponent } from './lista-consultas/lista-consultas.component';
import { FormConsultaComponent } from './form-consulta/form-consulta.component';

const routes: Routes = [
  { path: '', component: ListaConsultasComponent },
  { path: 'nueva', component: FormConsultaComponent },
  { path: 'editar/:id', component: FormConsultaComponent }
];

@NgModule({
  declarations: [ListaConsultasComponent, FormConsultaComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ConsultasModule {}
