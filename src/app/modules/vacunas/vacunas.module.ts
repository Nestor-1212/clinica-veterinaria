import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaVacunasComponent } from './lista-vacunas/lista-vacunas.component';
import { FormVacunaComponent } from './form-vacuna/form-vacuna.component';

const routes: Routes = [
  { path: '', component: ListaVacunasComponent },
  { path: 'nueva', component: FormVacunaComponent },
  { path: 'editar/:id', component: FormVacunaComponent }
];

@NgModule({
  declarations: [ListaVacunasComponent, FormVacunaComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class VacunasModule {}
